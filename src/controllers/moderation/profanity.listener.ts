import { Events, Message } from "discord.js";
import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";

import getLogger from "../../logger";
import {
  ListenerSpec,
  MessageListenerBuilder,
} from "../../types/listener.types";
import { GUILD_EMOJIS } from "../../utils/emojis.utils";
import { formatContext } from "../../utils/logging.utils";

const log = getLogger(__filename);

const profanityMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

async function reactWithNekoGun(message: Message): Promise<void> {
  await message.react(GUILD_EMOJIS.NEKO_GUN);
  const context = formatContext(message);
  log.debug(`${context}: detected profanity, reacted with gun emoji.`);
}

function checkAndLogProfanityMatches(message: Message): boolean {
  // Pass "true" as the "sorted" parameter so the matches are sorted by their
  // position.
  const matches = profanityMatcher.getAllMatches(message.content, true);
  if (matches.length === 0) return false;

  const entries: string[] = [];
  for (const match of matches) {
    const { phraseMetadata, startIndex, endIndex } =
      englishDataset.getPayloadWithPhraseMetadata(match);
    if (!phraseMetadata) continue;
    entries.push(
      `${phraseMetadata.originalWord}@[${startIndex}:${endIndex}]`,
    );
  }

  const context = formatContext(message);
  log.info(
    `${context}: detected profanity in ${message.url}: ${entries.join(", ")}`,
  );
  return true;
}

const profanitySpec: ListenerSpec<Events.MessageCreate>
  = new MessageListenerBuilder()
    .setId("profanity")
    .filter(checkAndLogProfanityMatches)
    .execute(reactWithNekoGun)
    .toSpec();

export default profanitySpec;
