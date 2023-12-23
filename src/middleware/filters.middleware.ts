import { Events } from "discord.js";

import { ListenerFilter } from "../types/listener.types";
import uids from "../utils/uids.utils";

export const ignoreBots: ListenerFilter<Events.MessageCreate> =
  message => !message.author.bot;

export function messageFrom(
  key: keyof typeof uids,
): ListenerFilter<Events.MessageCreate> {
  return message => message.author.id === uids[key];
}
