import { Events, Message } from "discord.js";

import {
  CooldownManager,
  useCooldown,
} from "../../middleware/cooldown.middleware";
import {
  contentMatching,
  messageFrom,
} from "../../middleware/filters.middleware";
import { ListenerSpec } from "../../types/listener.types";
import { replySilently } from "../../utils/interaction.utils";

async function execute(message: Message) {
  await replySilently(message, "woof");
};

const cooldown = new CooldownManager({ type: "global", seconds: 600 });

const uffSpec: ListenerSpec<Events.MessageCreate> = {
  type: Events.MessageCreate,
  id: "uff",
  execute,
  filters: [
    messageFrom("COFFEE"),
    contentMatching(/^uff$/i),
    useCooldown(cooldown),
  ],
  cooldown,
};

export default uffSpec;
