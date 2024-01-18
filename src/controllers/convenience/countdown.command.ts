import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TimestampStyles,
  time,
  userMention,
} from "discord.js";
import parseDuration from "parse-duration";

import getLogger from "../../logger";
import { CommandBuilder, CommandSpec } from "../../types/command.types";
import {
  addDateSeconds,
  formatHoursMinsSeconds,
} from "../../utils/dates.utils";
import { formatContext } from "../../utils/logging.utils";
import { addEphemeralOption } from "../../utils/options.utils";

const log = getLogger(__filename);

function durationToSeconds(humanReadableDuration: string): number | null {
  const seconds = parseDuration(humanReadableDuration, "sec");
  return seconds ?? null;
}

const slashCommandDefinition = new SlashCommandBuilder()
  .setName("countdown")
  .setDescription("Start a countdown.")
  .addStringOption(input => input
    .setName("duration")
    .setDescription("Duration to count down from e.g. \"10s\".")
    .setRequired(true),
  );
addEphemeralOption(slashCommandDefinition);

async function startCountdown(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const context = formatContext(interaction);

  const ephemeral = !!interaction.options.getBoolean("ephemeral");
  const duration = interaction.options.getString("duration", true);

  const seconds = durationToSeconds(duration);
  if (seconds === null) {
    log.info(`${context}: failed to parse \`${duration}\` as a duration.`);
    await interaction.reply({
      content: `Failed to interpret \`${duration}\` as a duration...`,
      ephemeral: true,
    });
    return;
  }

  // I'm not dealing with edge cases from very small intervals.
  if (seconds < 3) {
    log.debug(`${context}: rejected seconds=${seconds}.`);
    await interaction.reply({
      content: "Duration must be at least 3 seconds!",
      ephemeral: true,
    });
    return;
  }

  const endTimestamp = addDateSeconds(new Date(), seconds);
  setTimeout(async () => {
    const mention = userMention(interaction.member!.user.id);
    log.debug(`${context}: countdown from ${seconds} ago expired.`);
    await interaction.channel!.send(`${mention}, your countdown has expired!`);
  }, seconds * 1000);
  log.info(
    `${context}: set timeout for ${seconds} seconds (ends at ${endTimestamp}).`,
  );

  const response =
    `Counting down to ${formatHoursMinsSeconds(seconds)} from now. ` +
    `Expiring ${time(endTimestamp, TimestampStyles.RelativeTime)}...`;
  await interaction.reply({ content: response, ephemeral });
}

const countdownSpec: CommandSpec = new CommandBuilder()
  .define(slashCommandDefinition)
  .execute(startCountdown)
  .toSpec();

export default countdownSpec;
