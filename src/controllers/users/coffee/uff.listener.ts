import { Events } from "discord.js";

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
import { replySilently } from "../../../utils/interaction.utils";

const cooldown = new CooldownManager({ type: "global", seconds: 600 });

const uffSpec: ListenerSpec<Events.MessageCreate>
  = new MessageListenerBuilder()
    .setId("uff")
    .filter(messageFrom("COFFEE"))
    .filter(contentMatching(/^uff$/i))
    .execute(async (message) => await replySilently(message, "woof"))
    .filter(useCooldown(cooldown))
    .saveCooldown(cooldown)
    .toSpec();

export default uffSpec;
