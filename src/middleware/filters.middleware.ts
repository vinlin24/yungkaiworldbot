import { Events } from "discord.js";

import config from "../config";
import { ListenerFilter } from "../types/listener.types";

// TODO: probably belongs in another file.
const KEY_TO_UIDS = {
  "LUKE": config.LUKE_UID,
  "KLEE": config.KLEE_UID,
};

export function messageFrom(
  key: keyof typeof KEY_TO_UIDS,
): ListenerFilter<Events.MessageCreate> {
  return message => message.author.id === KEY_TO_UIDS[key];
}
