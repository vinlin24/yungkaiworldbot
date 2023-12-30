import { Client, Events } from "discord.js";

import getLogger from "../../logger";
import { ListenerBuilder, ListenerSpec } from "../../types/listener.types";

const log = getLogger(__filename);

async function handleReady(client: Client): Promise<void> {
  log.info(`bot ready! Logged in as ${client.user?.tag}.`);
}

const onReady: ListenerSpec<Events.ClientReady>
  = new ListenerBuilder(Events.ClientReady)
    .setId("READY")
    .setOnce()
    .execute(handleReady)
    .toSpec();

export default onReady;
