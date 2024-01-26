import { ChatInputCommandInteraction, Message } from "discord.js";

export async function fetchMostRecentMessage(
  interaction: ChatInputCommandInteraction,
): Promise<Message> {
  const messages = await interaction.channel!.messages.fetch({ limit: 1 });
  const message = Array.from(messages.values())[0];
  return message;
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
