import { EmojiIdentifierResolvable, Events, Message } from "discord.js";

import config from "../../config";
import getLogger from "../../logger";
import {
  ListenerSpec,
  MessageListenerBuilder,
} from "../../types/listener.types";
import { formatContext } from "../../utils/logging.utils";

const log = getLogger(__filename);

function getEmojiToUse(message: Message): EmojiIdentifierResolvable | null {
  const { attachments, channelId, reference, content } = message;

  const hasImage = attachments.some(a => a.contentType?.startsWith("image/"));
  const isAReply = !!reference;

  // PATTERN 1.
  if (!isAReply && hasImage) {
    switch (channelId) {
      case config.ARTWORK_CID:
        return "🤩";
      case config.MEDIA_CID:
        return "❤️";
      case config.STINKYS_FRIENDS_CID:
        return "🥺";
      case config.GAMING_CID:
        return "🫡";
      case config.COOKING_TIME_CID:
        return "🤤";
      default:
        return null;
    }
  }

  // PATTERN 2.
  if (channelId === config.INTRODUCTIONS_CID && !isAReply) {
    return "👋";
  }

  // Example link obtained from "Share > Copy Song Link":
  // https://open.spotify.com/track/5Yiwmn4PZAzVAms9UDICU2?si=67b6598c0b2d46aa
  const spotifyLinkPattern = new RegExp(
    "\\bhttps://open\\.spotify\\.com/(track|playlist)/[a-zA-Z0-9]+" +
    "(\\?si=[a-zA-Z0-9]+)?\\b",
  );

  // PATTERN 3.
  if (channelId === config.MUSIC_CHAT_CID && spotifyLinkPattern.exec(content)) {
    return "🔥";
  }

  return null;
}

async function reactIfApplicable(message: Message): Promise<boolean> {
  const emojiToUse = getEmojiToUse(message);
  if (emojiToUse === null) return false;
  await message.react(emojiToUse);
  log.info(`${formatContext(message)}: reacted with ${emojiToUse}.`);
  return true;
}

const channelReactSpec: ListenerSpec<Events.MessageCreate>
  = new MessageListenerBuilder()
    .setId("channel-react")
    .execute(reactIfApplicable)
    .toSpec();

export default channelReactSpec;
