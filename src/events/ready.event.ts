import { Events } from "discord.js";

import log from "../logger";
import { Listener } from "../types/controller.types";

const onReady = new Listener<Events.ClientReady>({
  name: Events.ClientReady,
  once: true,
});

onReady.execute(client => {
  log.info(`bot ready! Logged in as ${client.user?.tag}.`);
});

export default onReady;
