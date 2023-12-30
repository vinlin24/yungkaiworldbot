import { Events, Message } from "discord.js";

import getLogger from "../../logger";
import { CooldownManager, useCooldown } from "../../middleware/cooldown.middleware";
import {
  channelPollutionAllowed,
  contentMatching,
} from "../../middleware/filters.middleware";
import { ListenerSpec } from "../../types/listener.types";
import { replySilently } from "../../utils/interaction.utils";
import { formatContext } from "../../utils/logging.utils";

const log = getLogger(__filename);

async function execute(message: Message) {
  await replySilently(message, "deez");
  log.debug(`${formatContext(message)}: replied with deez.`);
};

const cooldown = new CooldownManager({ type: "global", seconds: 600 });

const deezSpec: ListenerSpec<Events.MessageCreate> = {
  type: Events.MessageCreate,
  id: "deez",
  execute,
  filters: [
    channelPollutionAllowed,
    contentMatching(/^deez$/i),
    useCooldown(cooldown),
  ],
  cooldown,
};

export default deezSpec;
