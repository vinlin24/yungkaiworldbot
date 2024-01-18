import { Events } from "discord.js";

import {
  channelPollutionAllowed,
  contentMatching,
} from "../../../middleware/filters.middleware";
import {
  ListenerSpec,
  MessageListenerBuilder,
} from "../../../types/listener.types";
import { echoContent } from "../../../utils/interaction.utils";

const deezSpec: ListenerSpec<Events.MessageCreate>
  = new MessageListenerBuilder()
    .setId("deez")
    .filter(channelPollutionAllowed)
    .filter(contentMatching(/^dee+z$/i))
    .execute(echoContent)
    .cooldown({ type: "global", seconds: 600 })
    .toSpec();

export default deezSpec;
