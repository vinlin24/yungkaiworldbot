import { Events, Message } from "discord.js";

import config from "../../../config";
import getLogger from "../../../logger";
import { contentMatching } from "../../../middleware/filters.middleware";
import {
  ListenerSpec,
  MessageListenerBuilder,
} from "../../../types/listener.types";
import { formatContext } from "../../../utils/logging.utils";

const log = getLogger(__filename);

async function reactWithVomit(message: Message) {
  await message.react("🤢");
  await message.react("🤮");
  log.debug(`${formatContext(message)}: reacted to uwu.`);
}

const uwuSpec: ListenerSpec<Events.MessageCreate>
  = new MessageListenerBuilder()
    .setId("uwu")
    .filter(contentMatching(/^uwu+$/i))
    .execute(reactWithVomit)
    .cooldown({
      type: "global",
      seconds: 10,
      bypassers: [config.COFFEE_UID],
    })
    .toSpec();

export default uwuSpec;
