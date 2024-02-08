import { ActivityType, Client, Events } from "discord.js";

import getLogger from "../../logger";
import settingsService from "../../services/settings.service";
import { ClientWithIntentsAndRunnersABC } from "../../types/client.abc";
import { ListenerBuilder, ListenerSpec } from "../../types/listener.types";

const log = getLogger(__filename);

async function handleReady(client: Client): Promise<void> {
  const botClient = client as ClientWithIntentsAndRunnersABC;

  const now = new Date();
  botClient.readySince = now;
  log.info(`bot ready! Logged in as ${botClient.user!.tag}.`);

  const presence = await settingsService.getPresence();
  if (!presence) return;
  await botClient.user!.setActivity({
    name: presence.activity_name,
    type: ActivityType[presence.activity_type],
  });
  log.info(`set startup activity to: ${JSON.stringify(presence)}.`);

  if (botClient.stealth) {
    await botClient.user!.setStatus("invisible");
    log.info("client is in stealth mode, set status to invisible.");
  }
}

const onReady: ListenerSpec<Events.ClientReady>
  = new ListenerBuilder(Events.ClientReady)
    .setId("READY")
    .setOnce()
    .execute(handleReady)
    .toSpec();

export default onReady;
