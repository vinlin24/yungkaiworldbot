import { Events } from "discord.js";

import { ListenerFilter } from "../types/listener.types";
import uids from "../utils/uids.utils";

/**
 * Ignore messages created by bot accounts.
 *
 * NOTE: This includes ALL bot users, not just our client's user. The latter
 * should always be ignored anyway as enforced by the event handler dispatcher.
 */
export const ignoreBots: ListenerFilter<Events.MessageCreate> =
  message => !message.author.bot;

/**
 * Only listen to messages created by a specific user available in our Discord
 * UID mapping.
 */
export function messageFrom(
  key: keyof typeof uids,
): ListenerFilter<Events.MessageCreate> {
  return message => message.author.id === uids[key];
}
