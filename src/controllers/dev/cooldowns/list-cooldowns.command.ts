import { pagination } from "@devraelfreeze/discordjs-pagination";
import { EmbedBuilder, Events, SlashCommandBuilder, User } from "discord.js";

import { BotClient } from "../../../bot/client";
import getLogger from "../../../logger";
import {
  GlobalCooldownDump,
  PerUserCooldownDump,
} from "../../../middleware/cooldown.middleware";
import { CommandBuilder } from "../../../types/command.types";
import { ListenerSpec } from "../../../types/listener.types";
import { formatHoursMinsSeconds } from "../../../utils/dates.utils";
import { formatContext } from "../../../utils/logging.utils";
import {
  joinUserMentions,
  toBulletedList,
  toRelativeTimestampMention,
  toTimestampMention,
  toUserMention,
} from "../../../utils/markdown.utils";
import { addBroadcastOption } from "../../../utils/options.utils";
import { listenerIdAutocomplete } from "./cooldowns.autocomplete";

const log = getLogger(__filename);

/**
 * Max characters for the description attribute of a Discord embed.
 */
const MAX_DESCRIPTION_LENGTH = 4096;

function formatStatus(now: Date, expiration: Date): string {
  if (now >= expiration)
    return "Inactive ✅";
  const mention = toTimestampMention(expiration);
  const relativeMention = toRelativeTimestampMention(expiration);
  return `Active until ${mention} (${relativeMention}) ⌛`;
}

function formatGlobalCooldownDump(
  now: Date,
  dump: GlobalCooldownDump,
): string {
  const bypasserMentions = joinUserMentions(dump.bypassers);
  const result = toBulletedList([
    "**Type:** GLOBAL",
    `**Status:** ${formatStatus(now, dump.expiration)}`,
    `**Duration:** ${formatHoursMinsSeconds(dump.seconds)}`,
    `**Bypassers:** ${bypasserMentions || "(none)"}`,
  ]);
  return result;
}

function formatPerUserCooldownDump(
  now: Date,
  dump: PerUserCooldownDump,
): string {
  const statuses: string[] = [];
  for (const [userId, expiration] of dump.expirations.entries()) {
    const mention = toUserMention(userId);
    statuses.push(`${mention}: ${formatStatus(now, expiration)}`);
  }
  const statusesBullets = toBulletedList(statuses, 1);

  const durations: string[] = [];
  for (const [userId, duration] of dump.overrides) {
    const mention = toUserMention(userId);
    durations.push(`${mention}: ${formatHoursMinsSeconds(duration)}`);
  }
  const durationsBullets = toBulletedList(durations, 1);

  const formattedDefault = formatHoursMinsSeconds(dump.defaultSeconds);
  const result = toBulletedList([
    "**Type:** PER-USER",
    "**Statuses:**" + (statusesBullets
      ? `\n${statusesBullets}`
      : " (none)"
    ),
    `**Default duration:** ${formattedDefault}`,
    "**Duration overrides:**" + (durationsBullets
      ? `\n${durationsBullets}`
      : " (none)"
    ),
  ]);
  return result;
}

function formatListenerCooldownDump(
  now: Date,
  listener: ListenerSpec<Events.MessageCreate>,
): string {
  const dump = listener.cooldown?.dump();
  let formatted: string;
  if (dump) {
    formatted = dump.type === "global"
      ? formatGlobalCooldownDump(now, dump)
      : formatPerUserCooldownDump(now, dump);
  } else {
    formatted = "(disabled)";
  }
  return `__**${listener.id}** Cooldown__\n${formatted}`;
}

function splitIntoEmbedPages(
  formattedDumpEntries: string[],
  maxCharsPerPage: number = MAX_DESCRIPTION_LENGTH,
): EmbedBuilder[] {
  const embeds: EmbedBuilder[] = []
  let description = "";
  for (const entry of formattedDumpEntries) {
    const { length } = entry;
    if (length > maxCharsPerPage) {
      log.warning( // TODO: not very helpful not knowing which dump lol.
        `a formatted cooldown dump has length ${length} > ` +
        `${maxCharsPerPage}, cannot fit it into an embed page, skipped.`
      );
      continue;
    }
    if (description.length + length > maxCharsPerPage) {
      const embed = new EmbedBuilder()
        .setTitle("Cooldown States")
        .setDescription(description.trimEnd());
      embeds.push(embed);
      description = "";
    }
    description += entry + "\n";
  }

  if (description) {
    const embed = new EmbedBuilder()
      .setTitle("Cooldown States")
      .setDescription(description.trimEnd());
    embeds.push(embed);
  }

  return embeds;
}

const listCooldowns = new CommandBuilder();

const slashCommandDefinition = new SlashCommandBuilder()
  .setName("cooldowns")
  .setDescription(
    "List current cooldowns associated with message creation events."
  )
  .addStringOption(input => input
    .setName("listener")
    .setDescription("ID of the listener (omit to list ALL cooldowns).")
    .setAutocomplete(true)
  );
addBroadcastOption(slashCommandDefinition);

listCooldowns.define(slashCommandDefinition);

listCooldowns.autocomplete(listenerIdAutocomplete);

listCooldowns.execute(async (interaction) => {
  const { options } = interaction;
  const broadcast = !!options.getBoolean("broadcast");
  const listenerId = options.getString("listener");

  const client = interaction.client as BotClient;
  const listenerMap = client.getListenerSpecs(Events.MessageCreate);

  // Caller provided an ID but it's invalid.
  if (listenerId && !listenerMap.get(listenerId)) {
    await interaction.reply({
      content: `There's no listener with cooldown with ID=\`${listenerId}\`!`,
      ephemeral: true,
    });
    return;
  }

  const context = formatContext(interaction);
  const now = new Date();

  // Caller provided a valid ID. Provide the dump for just that one listener.
  if (listenerId) {
    const listener = listenerMap.get(listenerId)!;
    await interaction.reply({
      content: formatListenerCooldownDump(now, listener),
      ephemeral: !broadcast,
      allowedMentions: { parse: [] }, // Suppress mention pinging.
    });
    log.debug(`${context}: dumped cooldown for ${listenerId}.`);
    return;
  }

  // Otherwise provide the dumps for all listeners.
  const listeners = Array.from(listenerMap.values());
  const entries = listeners
    .filter(l => l.cooldown?.type && l.cooldown.type !== "disabled")
    .map(l => formatListenerCooldownDump(now, l));

  if (entries.length === 0) {
    await interaction.reply({
      content:
        "The bot isn't listening for anything that could have a cooldown " +
        "at the moment!",
      ephemeral: !broadcast,
    });
    return;
  }

  const pages = splitIntoEmbedPages(entries, 600);
  await pagination({
    // @ts-expect-error. Embed constructor is private?? And you can't get Embed
    // from EmbedBuilder?? I think under the hood, it uses .toJSON() to get
    // APIEmbed, so leaving it as EmbedBuilder should be fine??
    embeds: pages,
    author: interaction.member!.user as User,
    interaction,
    ephemeral: !broadcast,
  });
  log.debug(`${context}: dumped cooldowns.`);
});

const listCooldownsSpec = listCooldowns.toSpec();
export default listCooldownsSpec;
