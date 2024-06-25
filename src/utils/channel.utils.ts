import { DMChannel, GuildMember, TextChannel } from "discord.js";
import winston from "winston";

import getLogger from "../logger";
import { HandlerProxy } from "../types/handler-proxy.abc";

export class TextChannelHandler extends HandlerProxy {
  constructor(
    /** The Discord channel to wrap. */
    public readonly channel: TextChannel,
    /** The logger to use. */
    logger?: winston.Logger,
  ) {
    super(channel, logger ?? getLogger(__filename));
  }

  public static async getDMChannel(member: GuildMember): Promise<DMChannel> {
    return member.dmChannel ?? await member.createDM();
  }

  protected override handleError(error: Error): void {
    // TODO: console.error() should be the fallback behavior. Implement an
    // if-else ladder with specialized behavior for specific types of errors.
    console.error(error);
  }
}
