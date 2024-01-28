import { ChatInputCommandInteraction, Message } from "discord.js";
import { sortBy } from "lodash";

import getLogger from "../../../logger";

const log = getLogger(__filename);

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

/**
 * The `reference` option should support notation with the caret (`^`)
 * character, inspired by Git reference notation. Examples:
 *
 * - `^`: Last message. Also equivalent to `^1`.
 * - `^^^`: Third last message. Also equivalent to `^3`.
 * - `^5`: Fifth last message.
 *
 * Return a number representing the message's reverse position in the channel.
 * For example, return 3 for the third last message.
 */
export function resolveCaretNotation(
  referenceId: string | null,
): number | null {
  if (referenceId === null) return null;

  // ^N case.
  const withNumberMatch = referenceId.match(/^\^(\d)+$/);
  if (withNumberMatch) {
    const numCarets = Number(withNumberMatch[1]);
    if (isNaN(numCarets)) {
      log.error(`unexpectedly extracted NaN from '${referenceId}'.`);
      return null;
    }
    return numCarets;
  }

  // ^... case.
  const fullCaretsMatch = referenceId.match(/^\^+$/);
  if (fullCaretsMatch) {
    return referenceId.length;
  }

  log.debug(`unrecognized /send reference caret notation: '${referenceId}'.`);
  return null;
}

/**
 * Resolve a message identifier (ID, URL, caret notation) to a message.
 */
export async function resolveMessageToRespondTo(
  interaction: ChatInputCommandInteraction,
  referenceIdentifier: string | null,
): Promise<Message | null | "invalid message"> {
  const numCarets = resolveCaretNotation(referenceIdentifier);
  if (numCarets !== null) {
    if (numCarets <= 0) return "invalid message";
    return await fetchNthMostRecentMessage(interaction, numCarets);
  }
  if (referenceIdentifier) {
    const message = await fetchMessageByIdentifier(
      referenceIdentifier,
      interaction,
    );
    if (message === null) return "invalid message";
    return message;
  }
  return null;
}
