// Program entry point.

import client from "./client";
import config from "./config";
import getLogger from "./logger";

const log = getLogger(__filename);

async function main() {
  if (process.argv.includes("--sync")) {
    log.warning("deploying slash commands only...");
    await client.deploySlashCommands();
  } else {
    log.info("preparing bot runtime...");
    const success = client.prepareRuntime();
    if (!success) process.exit(1);
    log.info("starting bot runtime...");
    await client.login(config.BOT_TOKEN);
  }
}

main();
