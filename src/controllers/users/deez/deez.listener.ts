import { Events, Message } from "discord.js";

import getLogger from "../../../logger";
import { CooldownManager, useCooldown } from "../../../middleware/cooldown.middleware";
import {
  channelPollutionAllowed,
  contentMatching,
} from "../../../middleware/filters.middleware";
import { ListenerSpec, MessageListenerBuilder } from "../../../types/listener.types";
import { replySilently } from "../../../utils/interaction.utils";
import { formatContext } from "../../../utils/logging.utils";

const log = getLogger(__filename);

async function execute(message: Message) {
  await replySilently(message, "deez");
  log.debug(`${formatContext(message)}: replied with deez.`);
};

const cooldown = new CooldownManager({ type: "global", seconds: 600 });

const deezSpec: ListenerSpec<Events.MessageCreate>
  = new MessageListenerBuilder()
    .setId("deez")
    .filter(channelPollutionAllowed)
    .filter(contentMatching(/^deez$/i))
    .execute(execute)
    .filter(useCooldown(cooldown))
    .saveCooldown(cooldown)
    .toSpec();

export default deezSpec;
