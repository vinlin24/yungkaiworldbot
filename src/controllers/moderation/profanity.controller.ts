import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";

import { Message } from "discord.js";
import getLogger from "../../logger";
import { Controller, MessageListener } from "../../types/controller.types";
import { GUILD_EMOJIS } from "../../utils/emojis.utils";
import { reactCustomEmoji } from "../../utils/interaction.utils";
import { formatContext } from "../../utils/logging.utils";

const log = getLogger(__filename);

const profanityMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

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
      `${phraseMetadata.originalWord}@[${startIndex}:${endIndex}]`
    );
  }

  const context = formatContext(message);
  log.info(
    `${context}: detected profanity in ${message.url}: ${entries.join(", ")}`
  );
  return true;
}

const onProfanity = new MessageListener("profanity");

onProfanity.filter(checkAndLogProfanityMatches);
onProfanity.execute(async (message) => {
  const success = await reactCustomEmoji(message, GUILD_EMOJIS.NEKO_GUN);
  if (success) {
    const context = formatContext(message);
    log.debug(`${context}: detected profanity, reacted with gun emoji.`);
  }
  return success;
});

const controller = new Controller({
  name: "profanity",
  commands: [],
  listeners: [onProfanity],
});

export default controller;
