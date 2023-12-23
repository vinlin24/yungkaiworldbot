import { SlashCommandBuilder } from "discord.js";

import { checkPrivilege, RoleLevel } from "../../middleware/privilege.middleware";
import { Command, Controller } from "../../types/controller.types";

const shutdownCommand = new Command(new SlashCommandBuilder()
  .setName("shutdown")
  .setDescription("Terminates the bot.")
);

shutdownCommand.prehook(checkPrivilege(RoleLevel.BABY_MOD));

shutdownCommand.execute(async (interaction) => {
  await interaction.reply({ content: "🫡", ephemeral: true });
  await interaction.client.destroy();
});

const spec: Controller = {
  name: "shutdown",
  commands: [shutdownCommand],
  listeners: [],
};

export default spec;
