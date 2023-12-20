import child_process from "node:child_process";

import { SlashCommandBuilder } from "discord.js";

import log from "../../logger";
import { CommandSpec } from "../../types/command.types";

function getCurrentBranchName(): string | null {
  const command = "git rev-parse --abbrev-ref HEAD";
  const process = child_process.spawnSync(command, { shell: true });
  if (process.status !== 0) {
    const stderr = process.stderr?.toString().trim();
    log.warn(
      `\`${command}\` failed with exit code ${process.status}` +
      (stderr ? `: ${stderr}` : "")
    );
    return null;
  }
  return process.stdout.toString().trim();
}

const spec: CommandSpec = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Basic sanity check command."),

  async execute(interaction) {
    let text = "Hello there!";

    // NOTE: For some reason, this seems to be -1 for a while right after bot
    // startup. Supposedly this is because the client has not sent its first
    // heartbeat yet.
    const latency = interaction.client.ws.ping;
    text += `\n* Latency: **${latency}** ms`;
    if (latency == 69) { // Easter egg.
      text += " (nice)";
    }

    const branchName = getCurrentBranchName();
    if (branchName !== null) {
      text += `\n* Branch: \`${branchName}\``;
    }

    await interaction.reply({ content: text, ephemeral: true });
  },
};

export default spec;
