import {
  Collection,
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder,
  userMention,
} from "discord.js";

import getLogger from "../../../logger";
import timeoutService from "../../../services/timeout.service";
import { CommandBuilder } from "../../../types/command.types";
import { formatContext } from "../../../utils/logging.utils";
import { timestampPair, toBulletedList } from "../../../utils/markdown.utils";

const log = getLogger(__filename);

const listTimeouts = new CommandBuilder();

listTimeouts.define(new SlashCommandBuilder()
  .setName("timeouts")
  .setDescription(
    "List currently timed out members as well as " +
    "members granted temporary immunity to timeouts.",
  ),
);

function formatTimedOutMembers(
  members: Collection<string, GuildMember>,
): [formatted: string, numTimedOut: number] {
  const now = new Date();

  const membersWithTimeout = members.filter(member => {
    const { communicationDisabledUntil: expiration } = member;
    // NOTE: As long as a member has been timed out before, the property can
    // exist on the object (non-null), so we have to check if the timeout is
    // expired.
    return expiration && expiration > now;
  });

  function formatMember(member: GuildMember): string {
    const mention = userMention(member.id);
    const until = member.communicationDisabledUntil!;
    const [untilMention, untilRelative] = timestampPair(until);
    return `${mention} until ${untilMention} (${untilRelative})`;
  }

  const entries = membersWithTimeout.map(formatMember);
  const description = entries.length === 0
    ? "No members are currently timed out!"
    : toBulletedList(entries);

  return [description, entries.length];
}

function formatImmuneMembers(): [formatted: string, numImmune: number] {
  const immunities = timeoutService.listImmunities();

  function formatMember(expiration: Date, uid: string): string {
    const [timestamp, relative] = timestampPair(expiration);
    return `${userMention(uid)} is immune until ${timestamp} (${relative}).`;
  }

  const entries = immunities.map(formatMember);
  const description = entries.length === 0
    ? "There are currently no members immune to timeouts!"
    : toBulletedList(entries);

  return [description, entries.length];
}

listTimeouts.execute(async interaction => {
  const members = await interaction.guild!.members.fetch();
  const [timedOutSummary, numTimedOut] = formatTimedOutMembers(members);
  const [immunitySummary, numImmune] = formatImmuneMembers();

  const embed = new EmbedBuilder()
    .setTitle("Timeout Statuses")
    .addFields({
      name: "Current Timeouts",
      value: timedOutSummary,
    }, {
      name: "Temporary Immunities",
      value: immunitySummary,
    });

  await interaction.reply({
    embeds: [embed],
    allowedMentions: { repliedUser: false, parse: [] },
  });

  const context = formatContext(interaction);
  log.info(
    `${context}: revealed ${numTimedOut} members with timeouts ` +
    `and ${numImmune} members with temporary immunity.`,
  );
});

const listTimeoutsSpec = listTimeouts.toSpec();
export default listTimeoutsSpec;
