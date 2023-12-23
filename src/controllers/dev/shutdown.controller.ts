import { SlashCommandBuilder } from "discord.js";

import getLogger from "../../logger";
import { checkPrivilege, RoleLevel } from "../../middleware/privilege.middleware";
import { Command, Controller } from "../../types/controller.types";
import { formatContext } from "../../utils/logging.utils";

const log = getLogger(__filename);

const shutdownCommand = new Command(new SlashCommandBuilder()
  .setName("shutdown")
  .setDescription("Terminates the bot.")
);

shutdownCommand.check(checkPrivilege(RoleLevel.BABY_MOD));

shutdownCommand.execute(async (interaction) => {
  await interaction.reply({ content: "🫡", ephemeral: true });
  await interaction.client.destroy();
  const context = formatContext(interaction);
  log.info(`${context}: terminated bot runtime.`);
});

const spec: Controller = {
  name: "shutdown",
  commands: [shutdownCommand],
  listeners: [],
};

export default spec;
