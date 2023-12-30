
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

onSniffs.filter(messageFrom("CXTIE"));
onSniffs.filter(message => {
  const sniffsWithPossibleMarkdown = /^(?:[*_`|~]*|#+ )sniffs?[*_`|~]*$/i;
  return !!message.content.match(sniffsWithPossibleMarkdown);
});
onSniffs.execute(async (message) => {
  await replySilently(message, message.content);
  const context = formatContext(message);
  log.info(`${context}: echoed sniffs.`);
});

const cooldown = new CooldownManager({ type: "global", seconds: 600 });
onSniffs.filter(useCooldown(cooldown));
onSniffs.saveCooldown(cooldown);

export default onSniffs.toSpec();
