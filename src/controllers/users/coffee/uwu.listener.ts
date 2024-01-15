import { Events, Message } from "discord.js";

import config from "../../../config";
import getLogger from "../../../logger";
import {
  CooldownManager,
  useCooldown,
} from "../../../middleware/cooldown.middleware";
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

const cooldown = new CooldownManager({
  type: "global",
  seconds: 10,
  bypassers: [config.COFFEE_UID],
});

const uwuSpec: ListenerSpec<Events.MessageCreate>
  = new MessageListenerBuilder()
    .setId("uwu")
    .filter(contentMatching(/^uwu$/i))
    .execute(reactWithVomit)
    .filter(useCooldown(cooldown))
    .saveCooldown(cooldown)
    .toSpec();

export default uwuSpec;
