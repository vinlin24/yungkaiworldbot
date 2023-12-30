import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import getLogger from "../../logger";
import {
  checkPrivilege,
  RoleLevel,
} from "../../middleware/privilege.middleware";
import { CommandBuilder, CommandSpec } from "../../types/command.types";
import { formatContext } from "../../utils/logging.utils";

const log = getLogger(__filename);

const slashCommandDefinition = new SlashCommandBuilder()
  .setName("shutdown")
  .setDescription("Terminates the bot.");

async function shutdownBot(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.reply({ content: "🫡", ephemeral: true });
  await interaction.client.destroy();
  const context = formatContext(interaction);
  log.info(`${context}: terminated bot runtime.`);
}

const shutdownSpec: CommandSpec = new CommandBuilder()
  .define(slashCommandDefinition)
  .check(checkPrivilege(RoleLevel.BABY_MOD))
  .execute(shutdownBot)
  .toSpec();

export default shutdownSpec;
