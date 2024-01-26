import {
  ChatInputCommandInteraction,
  Message,
  SlashCommandBuilder,
} from "discord.js";

import {
  RoleLevel,
  checkPrivilege,
} from "../../../middleware/privilege.middleware";
import { CommandBuilder } from "../../../types/command.types";

const devReact = new CommandBuilder();

devReact.define(new SlashCommandBuilder()
  .setName("react")
  .setDescription("Make the bot react to an existing message.")
  .addStringOption(input => input
    .setName("emoji")
    .setDescription("Emoji to react with.")
    .setRequired(true),
  )
  .addStringOption(input => input
    .setName("message")
    .setDescription(
      "Link or ID of message to react to " +
      "(defaults to last message of current channel).",
    ),
  ),
);

devReact.check(checkPrivilege(RoleLevel.DEV));
devReact.execute(async interaction => {
  const emoji = interaction.options.getString("emoji", true);
  const messageIdentifier = interaction.options.getString("message");

  const message = messageIdentifier
    ? await fetchMessageByIdentifier(messageIdentifier, interaction)
    : await fetchMostRecentMessage(interaction);
  if (!message) return false;

  try {
    await message.react(emoji);
  }
  catch (error) {
    await interaction.reply({
      content:
        `Failed to react with \`${emoji}\`. ` +
        "Are you sure this is a valid emoji?",
      ephemeral: true,
    });
    return false;
  }

  await interaction.reply({ content: "👍", ephemeral: true });
  return true;
});

async function fetchMessageByIdentifier(
  messageIdentifier: string,
  interaction: ChatInputCommandInteraction,
): Promise<Message | null> {
  const messageId = extractMessageID(messageIdentifier);
  if (messageId === null) {
    await interaction.reply({
      content: `\`${messageIdentifier}\` does not point to a valid message!`,
      ephemeral: true,
    });
    return null;
  }
  const message = await interaction.channel!.messages.fetch(messageId);
  return message;
}

async function fetchMostRecentMessage(
  interaction: ChatInputCommandInteraction,
): Promise<Message> {
  const messages = await interaction.channel!.messages.fetch({ limit: 1 });
  const message = Array.from(messages.values())[0];
  return message;
}

function extractMessageID(idOrUrl: string): string | null {
  const idRegexp = /^\d+$/i;
  // The string is an ID itself.
  if (idOrUrl.match(idRegexp)) return idOrUrl;

  // Otherwise see if it's a URL. Specifically, we only care about messages
  // within guild channels at the moment, hence /channels/.
  const urlRegexp = /^https:\/\/discord\.com\/channels\/\d+\/\d+\/(\d+)$/i;
  const match = idOrUrl.match(urlRegexp);
  if (!match) return null;
  const [, messageId] = match;
  return messageId;
}

const devReactSpec = devReact.toSpec();
export default devReactSpec;
