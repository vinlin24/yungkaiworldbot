import {
  CommandInteractionOptionResolver,
  SlashCommandBuilder,
} from "discord.js";
import parseDuration from "parse-duration";

import getLogger from "../../logger";
import { Command, Controller } from "../../types/controller.types";
import {
  addDateSeconds,
  formatHoursMinsSeconds,
} from "../../utils/dates.utils";
import { formatContext } from "../../utils/logging.utils";
import {
  toRelativeTimestampMention,
  toUserMention,
} from "../../utils/markdown.utils";

const log = getLogger(__filename);

function durationToSeconds(humanReadableDuration: string): number | null {
  const seconds = parseDuration(humanReadableDuration, "sec");
  return seconds ?? null;
}

const countdown = new Command(new SlashCommandBuilder()
  .setName("countdown")
  .setDescription("Start a countdown.")
  .addStringOption(input => input
    .setName("duration")
    .setDescription("Duration to count down from e.g. \"10s\".")
    .setRequired(true)
  )
);

countdown.execute(async (interaction) => {
  const context = formatContext(interaction);

  const options = interaction.options as CommandInteractionOptionResolver;
  const duration = options.getString("duration", true);

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
    const mention = toUserMention(interaction.member!.user.id);
    log.debug(`${context}: countdown from ${seconds} ago expired.`);
    await interaction.channel!.send(`${mention}, your countdown has expired!`);
  }, seconds * 1000);
  log.info(
    `${context}: set timeout for ${seconds} seconds (ends at ${endTimestamp}).`
  );

  const response =
    `Counting down to ${formatHoursMinsSeconds(seconds)} from now. ` +
    `Expiring ${toRelativeTimestampMention(endTimestamp)}...`
  await interaction.reply(response);
});

const timeController = new Controller({
  name: "time",
  commands: [countdown],
  listeners: [],
});

export default timeController;
