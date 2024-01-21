import {
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder,
  userMention,
} from "discord.js";

import getLogger from "../../../logger";
import { CommandBuilder } from "../../../types/command.types";
import { formatContext } from "../../../utils/logging.utils";
import { timestampPair, toBulletedList } from "../../../utils/markdown.utils";

const log = getLogger(__filename);

function formatTimedOutMember(member: GuildMember): string {
  const mention = userMention(member.id);
  const until = member.communicationDisabledUntil!;
  const [untilMention, untilRelative] = timestampPair(until);
  return `${mention} until ${untilMention} (${untilRelative})`;
}

const listTimeouts = new CommandBuilder();

listTimeouts.define(new SlashCommandBuilder()
  .setName("timeouts")
  .setDescription("List members that are currently timed out."),
);

listTimeouts.execute(async interaction => {
  const now = new Date();

  const members = await interaction.guild!.members.fetch();
  const membersWithTimeout = members.filter(member => {
    const { communicationDisabledUntil: expiration } = member;
    // NOTE: As long as a member has been timed out before, the property can
    // exist on the object (non-null), so we have to check if the timeout is
    // expired.
    return expiration && expiration > now;
  });
  const entries = membersWithTimeout.map(formatTimedOutMember);

  const description = entries.length === 0
    ? "No members are currently timed out!"
    : toBulletedList(entries);

  const embed = new EmbedBuilder()
    .setTitle("Current Timeouts")
    .setDescription(description);

  await interaction.reply({
    embeds: [embed],
    allowedMentions: { repliedUser: false, parse: [] },
  });

  const context = formatContext(interaction);
  log.info(`${context}: revealed ${entries.length} members with timeouts.`);
});

const listTimeoutsSpec = listTimeouts.toSpec();
export default listTimeoutsSpec;
