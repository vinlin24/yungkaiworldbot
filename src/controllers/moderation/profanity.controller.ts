import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";

import { Message } from "discord.js";
import getLogger from "../../logger";
import { Controller, MessageListener } from "../../types/controller.types";
import { formatContext } from "../../utils/logging.utils";

const log = getLogger(__filename);

const NEKO_GUN_EMOJI_NAME = "kzNekogun";

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
  const context = formatContext(message);
  const emojiCache = message.guild!.emojis.cache;
  const gunEmoji = emojiCache.find(emoji => emoji.name === NEKO_GUN_EMOJI_NAME);
  if (!gunEmoji) {
    log.warning(
      `${context}: no guild emoji with name '${NEKO_GUN_EMOJI_NAME}' found.`
    );
    return false;
  }
  await message.react(gunEmoji);
  log.debug(`${context}: detected profanity, reacted with gun emoji.`);
  return true;
});

const controller: Controller = {
  name: "profanity",
  commands: [],
  listeners: [onProfanity],
};

export default controller;
