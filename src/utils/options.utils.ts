import { SlashCommandBuilder } from "discord.js";

export function addBroadcastOption(builder: SlashCommandBuilder): void {
  builder.addBooleanOption(input => input
    .setName("broadcast")
    .setDescription("Whether to respond publicly instead of ephemerally.")
  );
}

export function addEphemeralOption(builder: SlashCommandBuilder): void {
  builder.addBooleanOption(input => input
    .setName("ephemeral")
    .setDescription("Whether to make the response ephemeral instead of public.")
  );
}
