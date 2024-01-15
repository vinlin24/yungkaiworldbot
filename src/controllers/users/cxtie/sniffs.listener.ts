import config from "../../../config";
import getLogger from "../../../logger";
import {
  CooldownManager,
  useCooldown,
} from "../../../middleware/cooldown.middleware";
import { messageFrom } from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";
import {
  GUILD_EMOJIS,
  parseCustomEmojis,
  toEscapedEmoji,
} from "../../../utils/emojis.utils";
import { replySilently } from "../../../utils/interaction.utils";
import { formatContext } from "../../../utils/logging.utils";

const log = getLogger(__filename);

const onSniffs = new MessageListenerBuilder().setId("sniffs");

function getSniffsToEcho(content: string): string | null {
  // Try to see if the content is "sniffs" with possible Markdown.
  const sniffsWithPossibleMarkdown = /^(?:[*_`|~]*|#+ )sniffs?[*_`|~]*$/i;
  const match = content.match(sniffsWithPossibleMarkdown);
  if (match) return match[0]; // Echo the whole sniffs, with possible Markdown.

  // Otherwise count the number of Cxtie sniff emojis there are and echo those.
  const customEmojis = parseCustomEmojis(content);
  const cxtieSniffsEmojis
    = customEmojis.filter(e => e.id === GUILD_EMOJIS.CXTIE_SNIFFS);
  const numSniffsEmojis = cxtieSniffsEmojis.length;
  if (numSniffsEmojis > 0) {
    return toEscapedEmoji(cxtieSniffsEmojis[0]).repeat(numSniffsEmojis);
  }

  // Nothing to act on this content string.
  return null;
}

onSniffs.filter(messageFrom(config.CXTIE_UID));
onSniffs.execute(async (message) => {
  const responseToEcho = getSniffsToEcho(message.content);
  if (responseToEcho === null) return false;

  const context = formatContext(message);

  // Echo half the time, appreciate the other half.
  const wouldSniffBack = Math.random() > 0.5;
  if (wouldSniffBack) {
    await replySilently(message, responseToEcho);
    log.info(`${context}: echoed '${responseToEcho}'.`);
  }
  else {
    await replySilently(message, "daily cxtie appreciation");
    log.info(`${context}: appreciated cxtie.`);
  }
  return true;
});

const cooldown = new CooldownManager({ type: "global", seconds: 300 });

onSniffs.filter(useCooldown(cooldown));
onSniffs.saveCooldown(cooldown);

const onSniffsSpec = onSniffs.toSpec();
export default onSniffsSpec;
