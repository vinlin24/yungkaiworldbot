// Program entry point.

import client from "./bot/client";
import env from "./config";
import getLogger from "./logger";

const log = getLogger(__filename);

async function main() {
  if (process.argv.includes("--sync")) {
    log.warning("deploying slash commands only...");
    await client.deploySlashCommands();
    return;
  }

  log.info("preparing bot runtime...");
  const success = client.prepareRuntime();
  if (!success) process.exit(1);

  log.info("starting bot runtime...");
  await client.login(env.BOT_TOKEN);
}

main();
