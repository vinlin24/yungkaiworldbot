import {
  AuditLogEvent,
  DMChannel,
  EmbedBuilder,
  Events,
  Guild,
  GuildAuditLogsEntry,
  GuildMember,
  GuildTextBasedChannel,
  MessageCreateOptions,
  MessageFlags,
  TimestampStyles,
  bold,
  time,
  userMention,
} from "discord.js";

import config from "../../../config";
import getLogger from "../../../logger";
import {
  RoleLevel,
  checkPrivilege,
} from "../../../middleware/privilege.middleware";
import timeoutService from "../../../services/timeout.service";
import { ListenerBuilder } from "../../../types/listener.types";
import { getDMChannel } from "../../../utils/interaction.utils";
import { toBulletedList } from "../../../utils/markdown.utils";

const log = getLogger(__filename);

const timeoutBroadcast = new ListenerBuilder(Events.GuildAuditLogEntryCreate)
  .setId("timeout-broadcast");

/**
 * Discriminated union to ease the processing of the audit log entry change
 * object.
 */
type TimeoutDetails = {
  type: "issued";
  until: Date;
  reason: string | null;
} | {
  type: "removed";
};

/**
 * Parse the audit log entry for relevant details regarding user timeout. Return
 * null on failure (entry does not correspond to a timeout or some other error).
 */
function getTimeoutDetails(
  auditLogEntry: GuildAuditLogsEntry,
): TimeoutDetails | null {
  const change = auditLogEntry.changes.find(
    c => c.key === "communication_disabled_until",
  );
  if (!change) return null;

  // old: undefined, new: <timestamp> means user got timed out.
  if (change.new) {
    return {
      type: "issued",
      until: new Date(change.new as string),
      reason: auditLogEntry.reason,
    };
  }

  // old: <timestamp>, new: undefined means user's timeout was removed.
  if (change.old) {
    return {
      type: "removed",
    };
  }

  // Shouldn't be reached but just in case.
  return null;
}

class TimeoutLogEventHandler {
  constructor(
    private details: TimeoutDetails,
    private executor: GuildMember,
    private target: GuildMember,
    private dmChannel: DMChannel,
    private broadcastChannel: GuildTextBasedChannel | null,
    private guild: Guild,
  ) { }

  /**
   * Process the timeout audit log event and return success status.
   */
  public async process(): Promise<boolean> {
    // Alpha mods and higher can bypass timeout immunity.
    const alphaOverride = checkPrivilege(RoleLevel.ALPHA_MOD, this.executor);

    const embed = this.formatEmbed(alphaOverride);
    const success = await this.sendEmbedToChannels(embed);

    if (success) {
      const targetUsername = this.target.user.username;
      if (this.details.type === "issued") {
        log.info(`reported timeout issued for @${targetUsername}.`);
      }
      else if (this.details.type === "removed") {
        log.info(`reported timeout removed for @${targetUsername}.`);
      }
    }

    await this.undoTimeoutIfApplicable(alphaOverride);
    return success;
  }

  /**
   * Consult policies to determine if the bot should undo the target's timeout,
   * and if so, remove the timeout.
   */
  private async undoTimeoutIfApplicable(alphaOverride: boolean): Promise<void> {
    const shouldUndoTimeout
      = this.details.type === "issued"
      && timeoutService.isImmune(this.target.id);

    const executorUsername = this.executor.user.username;
    const targetUsername = this.target.user.username;

    if (shouldUndoTimeout) {
      if (alphaOverride) {
        log.info(`@${executorUsername} bypasses @${targetUsername} immunity.`);
      }
      else {
        await this.target.timeout(null);
        log.info(`undid timeout for @${targetUsername}.`);
      }
    }
  }

  /**
   * Format and return the embed to DM and broadcast.
   */
  private formatEmbed(alphaOverride: boolean): EmbedBuilder {
    const embed = new EmbedBuilder();
    const { details, target, executor, guild } = this;

    if (details.type === "issued") {
      const timestamp = time(details.until);
      const relativeTime = time(details.until, TimestampStyles.RelativeTime);
      const description = toBulletedList([
        `${bold("For:")} ${userMention(target.id)}`,
        `${bold("By:")} ${userMention(executor.id)}`,
        `${bold("Until:")} ${timestamp} (${relativeTime})`,
        `${bold("Reason:")} ${details.reason ?? "(none given)"}`,
      ]);

      embed.setTitle(`${guild.name}: Timeout Issued`);
      embed.setDescription(description);

      if (timeoutService.isImmune(this.target.id) && alphaOverride) {
        embed.setFooter({
          text: "Timed by an Alpha+: timeout immunity bypassed.",
        });
      }
    }
    else if (details.type === "removed") {
      const description = toBulletedList([
        `${bold("For:")} ${userMention(target.id)}`,
        `${bold("By:")} ${userMention(executor.id)}`,
      ]);

      embed.setTitle(`${guild.name}: Timeout Removed`);
      embed.setDescription(description);

      if (this.executor.id === this.guild.client.user.id) {
        embed.setFooter({ text: "Timeout denied due to immunity policy!" });
      }
    }

    return embed;
  }

  /**
   * Handle sending the embed to both channels. If one fails, still attempt to
   * send to the other. Return true if there was no issue, else false (some kind
   * of error happened).
   */
  private async sendEmbedToChannels(embed: EmbedBuilder): Promise<boolean> {
    const payload: MessageCreateOptions = {
      embeds: [embed],
      flags: MessageFlags.SuppressNotifications,
    };

    let failed: boolean = false;
    const targetUsername = this.target.user.username;

    try {
      await this.dmChannel.send(payload);
      log.debug(`DM'ed @${targetUsername} reason for timeout.`);
    }
    catch (error) {
      log.error(`failed to DM @${targetUsername} timeout details.`);
      console.error(error);
      failed = true;
    }

    try {
      if (!this.broadcastChannel) {
        log.error(`no channel found with CID=${config.BOT_SPAM_CID}.`);
        failed = true;
      }
      else {
        await this.broadcastChannel.send(payload);
        log.debug(`broadcasted timeout in #${this.broadcastChannel.name}.`);
      }
    }
    catch (error) {
      log.error(`failed to broadcast timeout details for @${targetUsername}`);
      console.error(error);
      failed = true;
    }

    return !failed;
  }
}

timeoutBroadcast.filter((_, guild) => guild.id === config.YUNG_KAI_WORLD_GID);
timeoutBroadcast.filter(entry => entry.action === AuditLogEvent.MemberUpdate);

timeoutBroadcast.execute(async (auditLogEntry, guild) => {
  const details = getTimeoutDetails(auditLogEntry);
  if (!details) return false;

  const { executorId, targetId } = auditLogEntry;
  const executor = await guild.members.fetch(executorId!);
  const target = await guild.members.fetch(targetId!);

  const dmChannel = await getDMChannel(target);
  const broadcastChannel = await guild.channels.fetch(config.BOT_SPAM_CID) as
    GuildTextBasedChannel | null;

  const handler = new TimeoutLogEventHandler(
    details,
    executor,
    target,
    dmChannel,
    broadcastChannel,
    guild,
  );

  const success = await handler.process();
  return success;
});

const timeoutBroadcastSpec = timeoutBroadcast.toSpec();
export default timeoutBroadcastSpec;
