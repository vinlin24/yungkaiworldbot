import getLogger from "../../logger";
import { messageFrom } from "../../middleware/filters.middleware";
import { Controller, MessageListener } from "../../types/controller.types";
import { replySilently } from "../../utils/interaction.utils";
import { formatContext } from "../../utils/logging.utils";
import uids from "../../utils/uids.utils";

const log = getLogger(__filename);

const onSniffs = new MessageListener("sniffs");

onSniffs.filter(messageFrom("CXTIE"));
onSniffs.filter(message => {
  const sniffsWithPossibleMarkdown = /^(?:[*_`|~]*|#+ )sniffs?[*_`|~]*$/i;
  return !!message.content.match(sniffsWithPossibleMarkdown);
});

onSniffs.cooldown.set({
  type: "global",
  seconds: 600,
});

onSniffs.execute(async (message) => {
  await replySilently(message, message.content);
  const context = formatContext(message);
  log.info(`${context}: echoed sniffs.`);
});

const onChatRevive = new MessageListener("chat-revive");

onChatRevive.filter(message => {
  const chatReviveWithPossibleMD = /^(?:#+ )?chat revive[.!?~]*$/i;
  return !!message.content.match(chatReviveWithPossibleMD);
});
onChatRevive.cooldown.set({
  type: "user",
  defaultSeconds: 600,
});
if (uids.CXTIE === undefined) {
  log.warning("cxtie UID not found.");
} else {
  onChatRevive.cooldown.setBypass(true, uids.CXTIE);
}

onChatRevive.execute(async (message) => {
  await replySilently(message, "no");
});

const controller: Controller = {
  name: "cxtie",
  commands: [],
  listeners: [onSniffs, onChatRevive],
};

export default controller;
