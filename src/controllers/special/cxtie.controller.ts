import getLogger from "../../logger";
import { messageFrom } from "../../middleware/filters.middleware";
import { Controller, MessageListener } from "../../types/controller.types";
import { replySilently } from "../../utils/interaction.utils";
import { formatContext } from "../../utils/logging.utils";

const log = getLogger(__filename);

const onSniffs = new MessageListener()

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

const controller: Controller = {
  name: "cxtie",
  commands: [],
  listeners: [onSniffs],
};

export default controller;
