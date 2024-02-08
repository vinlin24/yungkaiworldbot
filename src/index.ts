// Program entry point.

import { BotClient } from "./bot/client";
import env from "./config";
import getLogger from "./logger";

const log = getLogger(__filename);

async function main() {
  const stealth = process.argv.includes("--stealth");
  const client = new BotClient(stealth);

  if (process.argv.includes("--sync")) {
    log.warning("deploying slash commands only...");
    await client.deploySlashCommands();
    return;
  }

  const success = client.prepareRuntime();
  if (!success) process.exit(1);

  log.info(`starting bot runtime... (stealth=${stealth})`);
  await client.login(env.BOT_TOKEN);
}

main();
