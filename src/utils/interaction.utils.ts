import { Message, MessageFlags } from "discord.js";

/**
 * Wrapper for the boilerplate of replying to a `Message` with the `@silent`
 * setting and without pinging the author.
 */
export async function replySilently(message: Message, content: string) {
  await message.reply({
    content,
    allowedMentions: { repliedUser: false },
    flags: MessageFlags.SuppressNotifications,
  });
}
