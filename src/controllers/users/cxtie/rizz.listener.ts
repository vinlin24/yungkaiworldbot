import { Message } from "discord.js";

import env from "../../../config";
import { messageFrom } from "../../../middleware/filters.middleware";
import cxtieService from "../../../services/cxtie.service";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { GUILD_EMOJIS } from "../../../utils/emojis.utils";

const onRizz = new MessageListenerBuilder().setId("rizz");

function containsTucksHairWithPossibleMarkdown(message: Message): boolean {
  const tucksHairWithPossibleMD = /^(?:#+ )?[*_~|]*tucks hair[*_~|]*$/i;
  return !!message.content.match(tucksHairWithPossibleMD);
}

onRizz.filter(messageFrom(env.CXTIE_UID));
onRizz.filter(message => {
  const containsEmojis = cxtieService.containsCringeEmojis(message);
  const containsTucksHair = containsTucksHairWithPossibleMarkdown(message);
  return containsEmojis || containsTucksHair;
});
onRizz.execute(async (message) => {
  await message.react(GUILD_EMOJIS.NEKO_GUN);
});

const onRizzSpec = onRizz.toSpec();
export default onRizzSpec;
