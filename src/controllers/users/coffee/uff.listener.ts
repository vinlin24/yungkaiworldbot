import { Events } from "discord.js";

import config from "../../../config";
import {
  contentMatching,
  messageFrom,
} from "../../../middleware/filters.middleware";
import {
  ListenerSpec,
  MessageListenerBuilder,
} from "../../../types/listener.types";
import { replySilentlyWith } from "../../../utils/interaction.utils";

const uffSpec: ListenerSpec<Events.MessageCreate>
  = new MessageListenerBuilder()
    .setId("uff")
    .filter(messageFrom(config.COFFEE_UID))
    .filter(contentMatching(/^uff+$/i))
    .execute(replySilentlyWith("woof"))
    .cooldown({ type: "global", seconds: 600 })
    .toSpec();

export default uffSpec;
