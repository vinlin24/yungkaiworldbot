import {
  AuditLogEvent,
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

import config from "../../config";
import getLogger from "../../logger";
import { ListenerBuilder } from "../../types/listener.types";
import { getDMChannel } from "../../utils/interaction.utils";
import { toBulletedList } from "../../utils/markdown.utils";

const log = getLogger(__filename);

const timeoutBroadcast = new ListenerBuilder(Events.GuildAuditLogEntryCreate)
  .setId("timeout-broadcast");

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

/**
 * Format and return the embed to DM and broadcast.
 */
function formatEmbed(
  details: TimeoutDetails,
  executor: GuildMember,
  target: GuildMember,
  guild: Guild,
): EmbedBuilder {
  const embed = new EmbedBuilder();

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
  }
  else if (details.type === "removed") {
    const description = toBulletedList([
      `${bold("For:")} ${userMention(target.id)}`,
      `${bold("By:")} ${userMention(executor.id)}`,
    ]);

    embed.setTitle(`${guild.name}: Timeout Removed`);
    embed.setDescription(description);
  }

  return embed;
}

timeoutBroadcast.execute(async (auditLogEntry, guild) => {
  if (guild.id !== config.YUNG_KAI_WORLD_GID) return false;

  const { action, executorId, targetId } = auditLogEntry;
  if (action !== AuditLogEvent.MemberUpdate) return false;

  const details = getTimeoutDetails(auditLogEntry);
  if (!details) return false;

  const executor = await guild.members.fetch(executorId!);
  const target = await guild.members.fetch(targetId!);

  const dmChannel = await getDMChannel(target);
  const broadcastChannel = await guild.channels.fetch(config.BOT_SPAM_CID) as
    GuildTextBasedChannel | null;
  if (!broadcastChannel) {
    log.error(`no channel found with CID=${config.BOT_SPAM_CID}.`);
    return false;
  }

  const embed = formatEmbed(details, executor, target, guild);
  const payload: MessageCreateOptions = {
    embeds: [embed],
    flags: MessageFlags.SuppressNotifications,
  };

  await dmChannel.send(payload);
  log.debug(`DM'ed @${target.user.username} reason for timeout.`);
  await broadcastChannel.send(payload);
  log.debug(`broadcasted timeout in #${broadcastChannel.name}.`);

  if (details.type === "issued") {
    log.info(`reported timeout issued for @${target.user.username}.`);
  }
  else if (details.type === "removed") {
    log.info(`reported timeout removed for @${target.user.username}.`);
  }
  return true;
});

const timeoutBroadcastSpec = timeoutBroadcast.toSpec();
export default timeoutBroadcastSpec;
