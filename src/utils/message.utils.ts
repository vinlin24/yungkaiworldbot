import {
  EmojiIdentifierResolvable,
  Message,
  MessageCreateOptions,
  MessageFlags,
  MessageReaction,
} from "discord.js";
import winston from "winston";

import getLogger from "../logger";
import { HandlerProxy } from "../types/handler-proxy.abc";
import { MessageListenerExecuteFunction } from "../types/listener.types";

/**
 * Wrapper for a discord.js `Message` to centralize error handling as well as
 * abstract common operations on messages.
 */
export class MessageHandler extends HandlerProxy {
  constructor(
    /** The Discord message to wrap. */
    public readonly message: Message,
    /* The logger to use. */
    logger?: winston.Logger,
  ) {
    super(message, logger ?? getLogger(__filename));
  }

  /**
   * Reply to the message. This wraps `Message#reply` by providing our own
   * centralized, custom error handling.
   */
  public async reply(
    options: string | MessageCreateOptions,
  ): Promise<Message | null> {
    try {
      return await this.message.reply(options);
    }
    catch (error) {
      this.log.error(
        `${this.context}: failed to reply to message ${this.message.url}.`,
      );
      this.handleError(error as Error);
      return null;
    }
  }

  /**
   * Wrapper for the boilerplate of replying to a `Message` with the `@silent`
   * setting and without pinging anyone.
   */
  public async replySilently(
    options: string | MessageCreateOptions,
  ): Promise<Message | null> {
    let payload = typeof options === "string" ? { options } : options;
    payload = {
      ...payload,
      allowedMentions: { repliedUser: false, parse: [] },
      flags: MessageFlags.SuppressNotifications,
    };
    return await this.reply(payload);
  }

  /**
   * Same as `replySilently` but return a closure that can be passed directly to
   * `Listener#execute`.
   */
  public static replySilentlyWith(
    options: string | MessageCreateOptions,
    logger?: winston.Logger,
  ): MessageListenerExecuteFunction {
    return async message => {
      await new MessageHandler(message, logger).replySilently(options);
    };
  }

  /**
   * Reacts to the message with the specified emoji. This wraps `Message#react`
   * by providing our own centralized, custom error handling.
   */
  public async react(
    emoji: EmojiIdentifierResolvable,
  ): Promise<MessageReaction | null> {
    try {
      return await this.message.react(emoji);
    }
    catch (error) {
      this.log.error(
        `${this.context}: failed to react with ${emoji} ` +
        `to message ${this.message.url}.`,
      );
      this.handleError(error as Error);
      return null;
    }
  }

  /**
   * Same as `react` but return a closure that can be passed directly to
   * `Listener#execute`.
   */
  public static reactWith(
    emoji: EmojiIdentifierResolvable,
    logger?: winston.Logger,
  ): MessageListenerExecuteFunction {
    return async message => {
      await new MessageHandler(message, logger).react(emoji);
    };
  }

  /**
   * Simply echo the message's content. This replies silently.
   */
  public async echo(): Promise<Message | null> {
    return await this.replySilently(this.message.content);
  }

  /**
   * Same as `echo` but return a closure that can be passed directly to
   * `Listener#execute`.
   */
  public static echoContent(
    logger?: winston.Logger,
  ): MessageListenerExecuteFunction {
    return async message => {
      await new MessageHandler(message, logger).echo();
    };
  }

  protected override handleError(error: Error): void {
    // TODO: console.error() should be the fallback behavior. Implement an
    // if-else ladder with specialized behavior for specific types of errors.
    console.error(error);
  }
}
