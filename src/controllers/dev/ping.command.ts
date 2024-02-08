import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TimestampStyles,
  bold,
  time,
} from "discord.js";

import { CommandBuilder, CommandSpec } from "../../types/command.types";

import { ClientWithIntentsAndRunnersABC } from "../../types/client.abc";
import { addBroadcastOption } from "../../utils/options.utils";

const slashCommandDefinition = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Basic sanity check command.");
addBroadcastOption(slashCommandDefinition);

async function respondWithDevDetails(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const client = interaction.client as ClientWithIntentsAndRunnersABC;

  let text = "Hello there!";

  const latency = client.ws.ping;
  // NOTE: For some reason, this seems to be -1 for a while right after bot
  // startup. Supposedly this is because the client has not sent its first
  // heartbeat yet.
  if (latency === -1) {
    text += "\n* Latency: (still being calculated...)";
  }
  else {
    text += `\n* Latency: **${latency}** ms`;
    if (latency == 69) { // Easter egg.
      text += " (nice)";
    }
  }

  const { branchName, readySince, stealth } = client;

  text += `\n* Mode: ${bold(stealth ? "Stealth" : "Normal")}`;

  if (branchName) {
    text += `\n* Branch: \`${branchName}\``;
  }

  if (readySince) {
    const timestamp = time(readySince);
    const relativeTimestamp = time(readySince, TimestampStyles.RelativeTime);
    text += `\n* Ready: ${timestamp} (${relativeTimestamp})`;
  }

  const broadcast = interaction.options.getBoolean("broadcast");
  await interaction.reply({ content: text, ephemeral: !broadcast });
}

const pingSpec: CommandSpec = new CommandBuilder()
  .define(slashCommandDefinition)
  .execute(respondWithDevDetails)
  .toSpec();

export default pingSpec;
