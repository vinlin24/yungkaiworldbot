import { SlashCommandBuilder } from "discord.js";

import { checkPrivilege, RoleLevel } from "../../middleware/privilege.middleware";
import { CommandSpec, ModuleSpec } from "../../types/spec.types";

const shutdownCommand = new CommandSpec(new SlashCommandBuilder()
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
  events: [],
};

export default spec;
