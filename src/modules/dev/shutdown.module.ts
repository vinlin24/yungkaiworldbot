import { SlashCommandBuilder } from "discord.js";

import { checkPrivilege, RoleLevel } from "../../middleware/privilege.middleware";
import { Command, ModuleSpec } from "../../types/module.types";

const shutdownCommand = new Command(new SlashCommandBuilder()
  .setName("shutdown")
  .setDescription("Terminates the bot.")
);

shutdownCommand.prehook(checkPrivilege(RoleLevel.BABY_MOD));

shutdownCommand.execute(async (interaction) => {
  await interaction.reply({ content: "🫡", ephemeral: true });
  await interaction.client.destroy();
});

const spec: ModuleSpec = {
  name: "shutdown",
  commands: [shutdownCommand],
  listeners: [],
};

export default spec;
