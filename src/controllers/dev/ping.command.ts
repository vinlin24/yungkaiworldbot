import child_process from "node:child_process";

import {
  CommandInteractionOptionResolver,
  SlashCommandBuilder,
} from "discord.js";

import {
  CommandExecuteFunction,
  CommandOptions,
  CommandSpec,
} from "../../types/command.types";

import getLogger from "../../logger";

const log = getLogger(__filename);

function getCurrentBranchName(): string | null {
  const command = "git rev-parse --abbrev-ref HEAD";
  const process = child_process.spawnSync(command, { shell: true });
  if (process.status !== 0) {
    const stderr = process.stderr?.toString().trim();
    log.warning(
      `\`${command}\` failed with exit code ${process.status}` +
      (stderr ? `: ${stderr}` : "")
    );
    return null;
  }
  return process.stdout.toString().trim();
}

const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Basic sanity check command.")
  .toJSON();

const options: CommandOptions = {
  broadcastOption: true,
};

const execute: CommandExecuteFunction = async (interaction) => {
  let text = "Hello there!";

  const latency = interaction.client.ws.ping;
  // NOTE: For some reason, this seems to be -1 for a while right after bot
  // startup. Supposedly this is because the client has not sent its first
  // heartbeat yet.
  if (latency === -1) {
    text += `\n* Latency: (still being calculated...)`
  } else {
    text += `\n* Latency: **${latency}** ms`;
    if (latency == 69) { // Easter egg.
      text += " (nice)";
    }
  }

  const branchName = getCurrentBranchName();
  if (branchName !== null) {
    text += `\n* Branch: \`${branchName}\``;
  }

  const options = interaction.options as CommandInteractionOptionResolver;
  const broadcast = options.getBoolean("broadcast");
  await interaction.reply({ content: text, ephemeral: !broadcast });
};

const pingSpec: CommandSpec = { data, execute, options };

export default pingSpec;
