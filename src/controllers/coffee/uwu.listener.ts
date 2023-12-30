import { Events, Message } from "discord.js";

import getLogger from "../../logger";
import {
  CooldownManager,
  useCooldown,
} from "../../middleware/cooldown.middleware";
import { contentMatching } from "../../middleware/filters.middleware";
import { ListenerSpec } from "../../types/listener.types";
import { formatContext } from "../../utils/logging.utils";
import uids from "../../utils/uids.utils";

const log = getLogger(__filename);

async function execute(message: Message) {
  await message.react("🤢");
  await message.react("🤮");
  log.debug(`${formatContext(message)}: reacted to uwu.`);
};

const cooldown = new CooldownManager({ type: "global", seconds: 10 });

if (uids.COFFEE === undefined) {
  log.warning("coffee UID not found");
} else {
  cooldown.setBypass(true, uids.COFFEE);
}

const uwuSpec: ListenerSpec<Events.MessageCreate> = {
  type: Events.MessageCreate,
  id: "uwu",
  execute,
  filters: [contentMatching(/^uwu$/i), useCooldown(cooldown)],
  cooldown,
};

export default uwuSpec;
