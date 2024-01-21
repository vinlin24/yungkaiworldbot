import {
  ChatInputCommandInteraction,
  GuildMember,
  PermissionFlagsBits,
  SlashCommandBuilder,
  userMention,
} from "discord.js";

import {
  RoleLevel,
  checkPrivilege,
} from "../../../middleware/privilege.middleware";
import timeoutService from "../../../services/timeout.service";
import { CommandBuilder } from "../../../types/command.types";
import { addDateSeconds, durationToSeconds } from "../../../utils/dates.utils";
import { timestampPair } from "../../../utils/markdown.utils";

const timeoutImmunity = new CommandBuilder();

timeoutImmunity.define(new SlashCommandBuilder()
  .setName("set-timeout-immunity")
  .setDescription("Set temporary timeout immunity for a user.")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addBooleanOption(input => input
    .setName("immune")
    .setDescription("True to grant immunity, False to revoke.")
    .setRequired(true),
  )
  .addUserOption(input => input
    .setName("user")
    .setDescription("User for which to update immunity status.")
    .setRequired(true),
  )
  .addStringOption(input => input
    .setName("duration")
    .setDescription(
      "Duration of immunity e.g. \"10 min\". " +
      "Uses minutes units are omitted. Defaults to 60 minutes.",
    ),
  ),
);

async function revokeImmunity(
  interaction: ChatInputCommandInteraction,
  target: GuildMember,
): Promise<boolean> {
  timeoutService.revokeImmunity(target.id);
  await interaction.reply({
    content: `Revoked timeout immunity for ${userMention(target.id)}`,
    allowedMentions: { parse: [] },
  });
  return true;
}

async function grantImmunity(
  interaction: ChatInputCommandInteraction,
  target: GuildMember,
  humanDuration: string,
): Promise<boolean> {
  const seconds = durationToSeconds(humanDuration, "minute");
  if (seconds === null) {
    await interaction.reply({
      content: `Failed to interpret \`${humanDuration}\` as a duration.`,
      ephemeral: true,
    });
    return false;
  }

  const expiration = addDateSeconds(seconds);
  timeoutService.grantImmunity(target.id, expiration);

  // Also try to untime the member if they happen to already be timed out.
  await target.timeout(null);

  const [timestamp, relative] = timestampPair(expiration);
  const response =
    `Granted timeout immunity for ${userMention(target.id)} ` +
    `until ${timestamp} (${relative}). ` +
    "I will try to undo their timeouts where possible! 🫡";

  await interaction.reply({
    content: response,
    allowedMentions: { parse: [] },
  });

  return true;
}

timeoutImmunity.check(checkPrivilege(RoleLevel.ALPHA_MOD));
timeoutImmunity.execute(async interaction => {
  const immune = interaction.options.getBoolean("immune", true);
  const target = interaction.options.getMember("user") as GuildMember;
  if (!immune) {
    return await revokeImmunity(interaction, target);
  }
  const duration = interaction.options.getString("duration") ?? "60 min";
  return await grantImmunity(interaction, target, duration);
});

const timeoutImmunitySpec = timeoutImmunity.toSpec();
export default timeoutImmunitySpec;
