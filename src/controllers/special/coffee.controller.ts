import getLogger from "../../logger";
import {
  channelPollutionAllowed,
  contentMatching,
  ignoreBots,
  messageFrom,
} from "../../middleware/filters.middleware";
import { Controller, MessageListener } from "../../types/controller.types";
import { replySilently } from "../../utils/interaction.utils";
import { formatContext } from "../../utils/logging.utils";
import uids from "../../utils/uids.utils";

const log = getLogger(__filename);

const onUwu = new MessageListener("uwu");

onUwu.filter(messageFrom("COFFEE"));
onUwu.filter(contentMatching(/^uwu$/i));
onUwu.cooldown.set({
  type: "global",
  seconds: 600,
});
onUwu.execute(async (message) => {
  await message.react("🤢");
  await message.react("🤮");
  log.debug(`${formatContext(message)}: reacted to uwu.`);
});

const onUff = new MessageListener("uff");

onUff.filter(messageFrom("COFFEE"));
onUff.filter(contentMatching(/^uff$/i));
onUff.cooldown.set({
  type: "global",
  seconds: 600,
});
onUff.execute(async (message) => {
  await replySilently(message, "woof");
});

const onCrazy = new MessageListener("crazy");

onCrazy.filter(ignoreBots);
onCrazy.filter(channelPollutionAllowed);
onCrazy.execute(async (message) => {
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
});


const lofiReacter = new MessageListener("lofi");

lofiReacter.filter(async (message) => {
  if (!message.reference)
    return false;

  const referenceId = message.reference.messageId!;
  const referencedMessage = await message.channel.messages.fetch(referenceId);

  const authorId = message.author.id;
  const repliedId = referencedMessage.author.id;
  return (
    (authorId === uids.COFFEE && repliedId === uids.LUKE) ||
    (authorId === uids.LUKE && repliedId === uids.COFFEE)
  );
});
lofiReacter.execute(async (message) => {
  await message.react("🇱");
  await message.react("🇴");
  await message.react("🇫");
  await message.react("🇮");
  log.debug(`${formatContext(message)}: reacted with LOFI.`);
});

const controller: Controller = {
  name: "coffee",
  commands: [],
  listeners: [onUwu, onUff, onCrazy, lofiReacter],
};

export default controller;
