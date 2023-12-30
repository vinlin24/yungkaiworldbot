import { Events, Message } from "discord.js";

import getLogger from "../../../logger";
import {
  channelPollutionAllowed,
  ignoreBots,
} from "../../../middleware/filters.middleware";
import {
  ListenerSpec,
  MessageListenerBuilder,
} from "../../../types/listener.types";
import { replySilently } from "../../../utils/interaction.utils";
import { formatContext } from "../../../utils/logging.utils";

const log = getLogger(__filename);

async function replyWithNextLineInCrazyCopypasta(message: Message) {
  const chars = message.content.toLowerCase();
  const withoutEndPunct = chars.replace(/[.!?~-]$/, "");

  let response: string;
  if (chars.endsWith("crazy?"))
    response = "I was crazy once.";
  else if (/.*crazy[.!~-]*$/i.exec(message.content))
    response = "Crazy?";
  else if (withoutEndPunct === "i was crazy once")
    response = "They locked me in a room";
  else if (withoutEndPunct === "they locked me in a room")
    response = "A rubber room";
  else if (withoutEndPunct === "a rubber room")
    response = "A rubber room with rats";
  else if (withoutEndPunct === "a rubber room with rats")
    response = "And rats make me crazy";
  else
    return

  await replySilently(message, response);
  log.debug(`${formatContext(message)}: replied with '${response}'.`);
}

const crazySpec: ListenerSpec<Events.MessageCreate>
  = new MessageListenerBuilder()
    .setId("crazy")
    .filter(ignoreBots)
    .filter(channelPollutionAllowed)
    .execute(replyWithNextLineInCrazyCopypasta)
    .toSpec();

export default crazySpec;
