import { Events } from "discord.js";

import log from "../logger";
import { EventSpec } from "../types/spec.types";

const onReady = new EventSpec<Events.ClientReady>({
  name: Events.ClientReady,
  once: true,
});

onReady.execute(client => {
  log.info(`bot ready! Logged in as ${client.user?.tag}.`);
});

export default onReady;
