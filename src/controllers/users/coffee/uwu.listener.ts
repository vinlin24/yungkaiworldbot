import { Events, Message } from "discord.js";

import env from "../../../config";
import getLogger from "../../../logger";
import { contentMatching } from "../../../middleware/filters.middleware";
import {
  ListenerSpec,
  MessageListenerBuilder,
} from "../../../types/listener.types";
import { GUILD_EMOJIS } from "../../../utils/emojis.utils";
import { formatContext } from "../../../utils/logging.utils";

const log = getLogger(__filename);

async function reactWithVomit(message: Message): Promise<void> {
  await message.react("🤢");
  await message.react("🤮");
  log.debug(`${formatContext(message)}: reacted with vomit to uwu.`);
}

async function reactWithKofi(message: Message): Promise<void> {
  await message.react(GUILD_EMOJIS.KOFI);
  log.debug(`${formatContext(message)}: reacted with kofi to uwu.`);
}

async function reactBasedOnAuthor(message: Message): Promise<void> {
  if (message.author.id === env.COFFEE_UID) {
    await reactWithKofi(message);
  }
  else {
    await reactWithVomit(message);
  }
}

const uwuSpec: ListenerSpec<Events.MessageCreate>
  = new MessageListenerBuilder()
    .setId("uwu")
    .filter(contentMatching(/\bu *(w *u)+u*\b/i))
    .execute(reactBasedOnAuthor)
    .cooldown({
      type: "global",
      seconds: 10,
      bypassers: [env.COFFEE_UID],
    })
    .toSpec();

export default uwuSpec;
