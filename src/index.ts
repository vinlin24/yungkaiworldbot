// Program entry point.

import { ArgumentParser, Namespace } from "argparse";

import { BotClient } from "./bot/client";
import env from "./config";
import getLogger from "./logger";

const log = getLogger(__filename);

const parser = new ArgumentParser({
  description: "Program entry point for the Discord bot of yung kai world.",
});

parser.add_argument("--sync", {
  action: "store_true",
  help: "deploy slash commands (do not start the bot runtime)",
});
parser.add_argument("--stealth", {
  action: "store_true",
  help: "start the bot runtime in stealth mode",
});

async function main() {
  const args = parser.parse_args() as Namespace;
  const { sync, stealth } = args;
  const client = new BotClient(stealth);

  if (sync) {
    log.warning("deploying slash commands only...");
    await client.deploySlashCommands();
    return;
  }

  const success = client.prepareRuntime();
  if (!success) process.exit(1);

  process.on("SIGINT", async () => {
    await client.destroy();
    log.warning("program terminating by SIGINT, client destroyed.");
    process.exit(130);
  });

  log.info(`starting bot runtime... (stealth=${stealth})`);
  await client.login(env.BOT_TOKEN);
}

main();
