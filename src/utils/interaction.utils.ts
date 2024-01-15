import { EmojiResolvable, Events, Message, MessageFlags } from "discord.js";

import getLogger from "../logger";
import { ListenerExecuteFunction } from "../types/listener.types";
import { formatContext } from "./logging.utils";

const log = getLogger(__filename);

/**
 * Wrapper for the boilerplate of replying to a `Message` with the `@silent`
 * setting and without pinging anyone.
 */
export async function replySilently(message: Message, content: string) {
  await message.reply({
    content,
    allowedMentions: { repliedUser: false, parse: [] },
    flags: MessageFlags.SuppressNotifications,
  });
}

/**
 * Same as `replySilently` but return a closure that can be passed directly to
 * `Listener#execute`.
 */
export function replySilentlyWith(content: string)
  : ListenerExecuteFunction<Events.MessageCreate> {
  return async (message) => {
    await replySilently(message, content);
    log.debug(`${formatContext(message)}: replied with '${content}'.`);
  };
}

/**
 * Return a closure that can be passed directly to `Listener#execute`. Reacts
 * to the message with the specified emoji.
 */
export function reactWith(emoji: EmojiResolvable)
  : ListenerExecuteFunction<Events.MessageCreate> {
  return async (message) => {
    await message.react(emoji);
    log.debug(`${formatContext(message)}: reacted with ${emoji}.`);
  };
}
