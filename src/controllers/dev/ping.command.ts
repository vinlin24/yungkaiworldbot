
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import {
  CommandBuilder, CommandSpec
} from "../../types/command.types";

import getLogger from "../../logger";
import { IClientWithIntentsAndRunners } from "../../types/client.abc";
import {
  toRelativeTimestampMention,
  toTimestampMention,
} from "../../utils/markdown.utils";
import { addBroadcastOption } from "../../utils/options.utils";

const log = getLogger(__filename);

const slashCommandDefinition = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Basic sanity check command.");
addBroadcastOption(slashCommandDefinition);

async function respondWithDevDetails(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const client = interaction.client as IClientWithIntentsAndRunners;

  let text = "Hello there!";

  const latency = client.ws.ping;
  // NOTE: For some reason, this seems to be -1 for a while right after bot
  // startup. Supposedly this is because the client has not sent its first
  // heartbeat yet.
  if (latency === -1) {
    text += `\n* Latency: (still being calculated...)`
  } else {
    text += `\n* Latency: **${latency}** ms`;
    if (latency == 69) { // Easter egg.
      text += " (nice)";
    }
  }

  const { branchName, readySince } = client;

  if (branchName) {
    text += `\n* Branch: \`${branchName}\``;
  }

  if (readySince) {
    const timestamp = toTimestampMention(readySince);
    const relativeTimestamp = toRelativeTimestampMention(readySince);
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
