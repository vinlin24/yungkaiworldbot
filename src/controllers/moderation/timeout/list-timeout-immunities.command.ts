import { EmbedBuilder, SlashCommandBuilder, userMention } from "discord.js";

import timeoutService from "../../../services/timeout.service";
import { CommandBuilder } from "../../../types/command.types";
import { timestampPair, toBulletedList } from "../../../utils/markdown.utils";
import { addBroadcastOption } from "../../../utils/options.utils";

const timeoutImmunities = new CommandBuilder();

const slashCommandDefinition = new SlashCommandBuilder()
  .setName("list-timeout-immunities")
  .setDescription("List members that are currently immune to timeouts.");
addBroadcastOption(slashCommandDefinition);

timeoutImmunities.define(slashCommandDefinition);

timeoutImmunities.execute(async interaction => {
  const broadcast = !!interaction.options.getBoolean("broadcast");

  function formatMember(expiration: Date, uid: string): string {
    const [timestamp, relative] = timestampPair(expiration);
    return `${userMention(uid)} is immune until ${timestamp} (${relative}).`;
  }

  const immunities = timeoutService.listImmunities();
  const entries = immunities.map(formatMember);
  const description = entries.length === 0
    ? "There are currently no members immune to timeouts!"
    : toBulletedList(entries);

  const embed = new EmbedBuilder()
    .setTitle("Temporary Timeout Immunities")
    .setDescription(description);

  await interaction.reply({ embeds: [embed], ephemeral: !broadcast });
});

const timeoutImmunitiesSpec = timeoutImmunities.toSpec();
export default timeoutImmunitiesSpec;
