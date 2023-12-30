import { AnySlashCommandBuilder } from "../types/command.types";

export function addBroadcastOption(builder: AnySlashCommandBuilder): void {
  builder.addBooleanOption(input => input
    .setName("broadcast")
    .setDescription("Whether to respond publicly instead of ephemerally.")
  );
}

export function addEphemeralOption(builder: AnySlashCommandBuilder): void {
  builder.addBooleanOption(input => input
    .setName("ephemeral")
    .setDescription("Whether to make the response ephemeral instead of public.")
  );
}
