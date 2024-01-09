import config from "../../../config";
import getLogger from "../../../logger";
import {
  CooldownManager,
  useCooldown,
} from "../../../middleware/cooldown.middleware";
import { messageFrom } from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { replySilently } from "../../../utils/interaction.utils";
import { formatContext } from "../../../utils/logging.utils";

const log = getLogger(__filename);

const onSniffs = new MessageListenerBuilder().setId("sniffs");

onSniffs.filter(messageFrom(config.CXTIE_UID));
onSniffs.filter(message => {
  const sniffsWithPossibleMarkdown = /^(?:[*_`|~]*|#+ )sniffs?[*_`|~]*$/i;
  return !!message.content.match(sniffsWithPossibleMarkdown);
});
onSniffs.execute(async (message) => {
  const context = formatContext(message);
  const wouldSniffBack = Math.random() > 0.5;
  if (wouldSniffBack) {
    await replySilently(message, message.content);
    log.info(`${context}: echoed sniffs.`);
  } else {
    await replySilently(message, "daily cxtie appreciation");
    log.info(`${context}: appreciated cxtie.`);
  }
});

const cooldown = new CooldownManager({ type: "global", seconds: 300 });

onSniffs.filter(useCooldown(cooldown));
onSniffs.saveCooldown(cooldown);

const onSniffsSpec = onSniffs.toSpec();
export default onSniffsSpec;
