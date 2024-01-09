import { Client, Events } from "discord.js";

import getLogger from "../../logger";
import { IClientWithIntentsAndRunners } from "../../types/client.abc";
import { ListenerBuilder, ListenerSpec } from "../../types/listener.types";

const log = getLogger(__filename);

async function handleReady(client: Client): Promise<void> {
  const now = new Date();
  (client as IClientWithIntentsAndRunners).readySince = now;
  log.info(`bot ready! Logged in as ${client.user?.tag}.`);
}

const onReady: ListenerSpec<Events.ClientReady>
  = new ListenerBuilder(Events.ClientReady)
    .setId("READY")
    .setOnce()
    .execute(handleReady)
    .toSpec();

export default onReady;
