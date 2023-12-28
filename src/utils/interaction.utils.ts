import { Events, GuildEmoji, Message, MessageFlags } from "discord.js";

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
  return async (message) => await replySilently(message, content);
}

class CustomEmojiReacter {
  private namesToEmojiCache: Record<string, GuildEmoji> = {};

  public react = async (message: Message, emojiName: string): Promise<void> => {
    let emoji: GuildEmoji;
    if (emojiName in this.namesToEmojiCache) {
      emoji = this.namesToEmojiCache[emojiName];
    } else {
      const emojiCache = message.guild?.emojis.cache;
      const maybeEmoji = emojiCache?.find(emoji => emoji.name === emojiName);
      if (!maybeEmoji) {
        const context = formatContext(message);
        log.warning(`${context}: no emoji with name '${emojiName}' found.`);
        return;
      }
      emoji = maybeEmoji;
      this.namesToEmojiCache[emojiName] = emoji;
    }

    await message.react(emoji);
  }
}

const customEmojiReacter = new CustomEmojiReacter();

export const reactCustomEmoji
  = customEmojiReacter.react.bind(customEmojiReacter);
