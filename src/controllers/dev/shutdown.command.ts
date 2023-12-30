import { SlashCommandBuilder } from "discord.js";

import getLogger from "../../logger";
import {
  checkPrivilege,
  RoleLevel,
} from "../../middleware/privilege.middleware";
import {
  CommandExecuteFunction,
  CommandSpec,
} from "../../types/command.types";
import { formatContext } from "../../utils/logging.utils";

const log = getLogger(__filename);

const data = new SlashCommandBuilder()
  .setName("shutdown")
  .setDescription("Terminates the bot.")
  .toJSON();

const execute: CommandExecuteFunction = async (interaction) => {
  await interaction.reply({ content: "🫡", ephemeral: true });
  await interaction.client.destroy();
  const context = formatContext(interaction);
  log.info(`${context}: terminated bot runtime.`);
};

const shutdownSpec: CommandSpec = {
  data,
  execute,
  checks: [checkPrivilege(RoleLevel.BABY_MOD)],
};

export default shutdownSpec;
