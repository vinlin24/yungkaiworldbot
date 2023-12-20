import { Client, Events } from "discord.js";

import log from "../logger";
import { EventSpec } from "../types/event.types";

const spec: EventSpec<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    log.info(`Bot ready! Logged in as ${client.user?.tag}.`);
  },
};

export default spec;
