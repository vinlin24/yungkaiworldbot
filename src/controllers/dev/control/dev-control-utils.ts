import { ChatInputCommandInteraction, Message } from "discord.js";
import { sortBy } from "lodash";

export async function fetchNthMostRecentMessage(
  interaction: ChatInputCommandInteraction,
  n: number,
): Promise<Message | null> {
  const collection = await interaction.channel!.messages.fetch({ limit: n });
  const messages = Array.from(collection.values());
  const sortedMessages = sortBy(messages, m => m.createdTimestamp);
  const nthRecentMessage = sortedMessages.at(0);
  return nthRecentMessage ?? null;
}

export function extractMessageID(idOrUrl: string): string | null {
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

export async function fetchMessageByIdentifier(
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
