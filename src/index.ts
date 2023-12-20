// Program entry point.

import client from "./client";
import config from "./config";
import log from "./logger";

async function main() {
  if (process.argv.includes("--sync")) {
    log.warn("deploying slash commands only...");
    await client.syncCommands();
  } else {
    log.info("starting bot runtime...");
    client.loadModules();
    await client.login(config.BOT_TOKEN);
  }
}

main();
