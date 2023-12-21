import { Client, Events } from "discord.js";

import log from "../logger";
import { EventSpec } from "../types/spec.types";

const spec: EventSpec<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    log.info(`bot ready! Logged in as ${client.user?.tag}.`);
  },
};

export default spec;
