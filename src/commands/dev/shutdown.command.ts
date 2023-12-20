import { SlashCommandBuilder } from "discord.js";

import { CommandSpec, RoleLevel } from "../../types/command.types";

const spec: CommandSpec = {
  privilege: RoleLevel.BABY_MOD,

  data: new SlashCommandBuilder()
    .setName("shutdown")
    .setDescription("Terminates the bot."),

  async execute(interaction) {
    await interaction.reply({ content: "🫡", ephemeral: true });
    await interaction.client.destroy();
  },
};

export default spec;
