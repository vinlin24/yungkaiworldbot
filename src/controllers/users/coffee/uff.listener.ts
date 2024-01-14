import { Events } from "discord.js";

import config from "../../../config";
import {
  CooldownManager,
  useCooldown,
} from "../../../middleware/cooldown.middleware";
import {
  contentMatching,
  messageFrom,
} from "../../../middleware/filters.middleware";
import {
  ListenerSpec,
  MessageListenerBuilder,
} from "../../../types/listener.types";
import { replySilentlyWith } from "../../../utils/interaction.utils";

const cooldown = new CooldownManager({ type: "global", seconds: 600 });

const uffSpec: ListenerSpec<Events.MessageCreate>
  = new MessageListenerBuilder()
    .setId("uff")
    .filter(messageFrom(config.COFFEE_UID))
    .filter(contentMatching(/^uff$/i))
    .execute(replySilentlyWith("woof"))
    .filter(useCooldown(cooldown))
    .saveCooldown(cooldown)
    .toSpec();

export default uffSpec;
