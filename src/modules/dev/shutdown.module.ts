import { SlashCommandBuilder } from "discord.js";

import { CommandSpec, ModuleSpec, RoleLevel } from "../../types/spec.types";

const shutdownCommand: CommandSpec = {
  privilege: RoleLevel.BABY_MOD,

  data: new SlashCommandBuilder()
    .setName("shutdown")
    .setDescription("Terminates the bot."),

  async execute(interaction) {
    await interaction.reply({ content: "🫡", ephemeral: true });
    await interaction.client.destroy();
  },
};

const spec: ModuleSpec = {
  name: "shutdown",
  commands: [shutdownCommand],
  events: [],
};

export default spec;
