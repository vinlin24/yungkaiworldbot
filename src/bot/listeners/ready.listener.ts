import { ActivityType, Client, Events } from "discord.js";

import getLogger from "../../logger";
import settingsService from "../../services/settings.service";
import { ClientWithIntentsAndRunnersABC } from "../../types/client.abc";
import { ListenerBuilder, ListenerSpec } from "../../types/listener.types";

const log = getLogger(__filename);

async function handleReady(client: Client): Promise<void> {
  const now = new Date();
  (client as ClientWithIntentsAndRunnersABC).readySince = now;
  log.info(`bot ready! Logged in as ${client.user!.tag}.`);

  const presence = await settingsService.getPresence();
  if (!presence) return;
  await client.user!.setActivity({
    name: presence.activity_name,
    type: ActivityType[presence.activity_type],
  });
  log.info(`set startup activity to: ${JSON.stringify(presence)}.`);
}

const onReady: ListenerSpec<Events.ClientReady>
  = new ListenerBuilder(Events.ClientReady)
    .setId("READY")
    .setOnce()
    .execute(handleReady)
    .toSpec();

export default onReady;
