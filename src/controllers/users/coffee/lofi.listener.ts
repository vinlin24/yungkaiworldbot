import { Events, Message } from "discord.js";

import env from "../../../config";
import getLogger from "../../../logger";
import {
  ListenerSpec,
  MessageListenerBuilder,
} from "../../../types/listener.types";
import { formatContext } from "../../../utils/logging.utils";

const log = getLogger(__filename);

const { LUKE_UID, COFFEE_UID } = env;

async function reactWithLOFI(message: Message) {
  await message.react("🇱");
  await message.react("🇴");
  await message.react("🇫");
  await message.react("🇮");
  log.debug(`${formatContext(message)}: reacted with LOFI.`);
}

async function isLukeOrCoffeeReplyingToEachOther(message: Message) {
  if (!message.reference) return false;

  const referenceId = message.reference.messageId!;
  const referencedMessage = await message.channel.messages.fetch(referenceId);

  const authorId = message.author.id;
  const repliedId = referencedMessage.author.id;
  return (
    (authorId === COFFEE_UID && repliedId === LUKE_UID) ||
    (authorId === LUKE_UID && repliedId === COFFEE_UID)
  );
}

const lofiSpec: ListenerSpec<Events.MessageCreate>
  = new MessageListenerBuilder()
    .setId("lofi")
    .filter(isLukeOrCoffeeReplyingToEachOther)
    .execute(reactWithLOFI)
    .toSpec();

export default lofiSpec;
