import {
  ChatInputCommandInteraction,
  DMChannel,
  EmojiResolvable,
  GuildMember,
  InteractionReplyOptions,
  InteractionResponse,
  Message,
  MessageCreateOptions,
  MessageFlags,
} from "discord.js";
import winston from "winston";

import getLogger from "../logger";
import { HandlerProxy } from "../types/handler-proxy.abc";
import { MessageListenerExecuteFunction } from "../types/listener.types";
import { formatContext } from "./logging.utils";

const log = getLogger(__filename);

/**
 * Wrapper for the boilerplate of replying to a `Message` with the `@silent`
 * setting and without pinging anyone.
 */
export async function replySilently(
  message: Message,
  content: string | MessageCreateOptions,
) {
  let payload = typeof content === "string" ? { content } : content;
  payload = {
    ...payload,
    allowedMentions: { repliedUser: false, parse: [] },
    flags: MessageFlags.SuppressNotifications,
  };
  await message.reply(payload);
}

/**
 * Same as `replySilently` but return a closure that can be passed directly to
 * `Listener#execute`.
 */
export function replySilentlyWith(content: string)
  : MessageListenerExecuteFunction {
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
  : MessageListenerExecuteFunction {
  return async (message) => {
    await message.react(emoji);
    log.debug(`${formatContext(message)}: reacted with ${emoji}.`);
  };
}

/**
 * Silently reply to the message with the message's own content.
 */
export const echoContent: MessageListenerExecuteFunction
  = async function (message) {
    await replySilently(message, message.content);
    log.debug(`${formatContext(message)}: echoed '${message.content}'.`);
  };

/**
 * Get the DM channel of a member.
 */
export async function getDMChannel(member: GuildMember): Promise<DMChannel> {
  return member.dmChannel ?? await member.createDM();
}

export async function replyWithGenericACK(
  interaction: ChatInputCommandInteraction,
  options?: Omit<InteractionReplyOptions, "content">,
): Promise<void> {
  await interaction.reply({
    content: "👍",
    ephemeral: true, // Default to ephemeral (possibly overridden thru options).
    ...(options ?? {}),
  });
}

/**
 * Wrapper for a discord.js `ChatInputCommandInteraction` to centralize error
 * handling as well as abstract common operations on interactions.
 */
export class ChatInputCommandInteractionHandler extends HandlerProxy {
  constructor(
    /** The Discord slash command interaction to wrap. */
    public readonly interaction: ChatInputCommandInteraction,
    /* The logger to use. */
    logger?: winston.Logger,
  ) {
    super(interaction, logger ?? getLogger(__filename));
  }

  /**
   * Reply to the interaction. This wraps `ChatInputCommandInteraction#reply` by
   * providing our own centralized, custom error handling.
   */
  public async reply(
    options: string | InteractionReplyOptions,
  ): Promise<InteractionResponse | null> {
    try {
      return await this.interaction.reply(options);
    }
    catch (error) {
      this.log.error(
        `${this.context}: failed to reply to interaction.`,
      );
      this.handleError(error as Error);
      return null;
    }
  }

  /**
   * Reply with some generic acknowledgement. Every interaction should be
   * replied to as to not display an "Application failed to respond." error
   * as the slash command output. If there is no meaningful response to give,
   * you can use this method.
   */
  public async replyWithGenericACK(
    options?: Omit<InteractionReplyOptions, "content">,
  ): Promise<InteractionResponse | null> {
    return await this.reply({
      content: "👍",
      // Default to ephemeral (possibly overridden thru options).
      ephemeral: true,
      ...(options ?? {}),
    });
  }

  protected override handleError(error: Error): void {
    // TODO: console.error() should be the fallback behavior. Implement an
    // if-else ladder with specialized behavior for specific types of errors.
    console.error(error);
  }
}
