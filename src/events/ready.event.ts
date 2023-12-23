import { Events } from "discord.js";

import getLogger from "../logger";
import { Listener } from "../types/controller.types";

const log = getLogger(__filename);

const onReady = new Listener<Events.ClientReady>({
  name: Events.ClientReady,
  once: true,
});

onReady.execute(client => {
  log.info(`bot ready! Logged in as ${client.user?.tag}.`);
});

export default onReady;
