import {
  AutocompleteInteraction,
  Collection,
  CommandInteractionOptionResolver,
  GuildMember,
  Role,
  SlashCommandBuilder,
} from "discord.js";

import { BotClient } from "../../client";
import { CooldownSpec } from "../../middleware/cooldown.middleware";
import {
  RoleLevel,
  checkPrivilege,
} from "../../middleware/privilege.middleware";
import {
  Command,
  Controller,
  MessageListener,
} from "../../types/controller.types";
import { formatHoursMinsSeconds } from "../../utils/dates.utils";
import { getAllMembers } from "../../utils/iteration.utils";
import { toBulletedList } from "../../utils/markdown.utils";

/**
 * Return a partial copy of the client's listener spec mapping with only the
 * listeners that are instances of `MessageListener`.
 */
function filterListenerMap(client: BotClient)
  : Collection<string, MessageListener> {
  return client.listenerSpecs
    .filter(listener => listener instanceof MessageListener)
    .mapValues(listener => listener as MessageListener);
}

async function listenerIdAutocomplete(interaction: AutocompleteInteraction) {
  const focusedValue = interaction.options.getFocused();

  const listeners = filterListenerMap(interaction.client as BotClient);
  const listenersWithCD = listeners.filter(l => l.cooldown.type !== "disabled");
  const choiceObjs = listenersWithCD
    .filter(({ id }) => id.startsWith(focusedValue))
    .map(({ id }) => ({ name: id, value: id }));

  await interaction.respond(choiceObjs);
}

const listCooldowns = new Command(new SlashCommandBuilder()
  .setName("cooldowns")
  .setDescription(
    "List current cooldowns associated with message creation events."
  )
  .addStringOption(input => input
    .setName("listener")
    .setDescription("ID of the listener (omit to list ALL cooldowns).")
    .setAutocomplete(true)
  ),
  { broadcastOption: true },
);

listCooldowns.check(checkPrivilege(RoleLevel.DEV)); // TEMP.
listCooldowns.autocomplete(listenerIdAutocomplete);
listCooldowns.execute(async (interaction) => {
  const options = interaction.options as CommandInteractionOptionResolver;
  const broadcast = options.getBoolean("broadcast");
  const listenerId = options.getString("listener");

  const listenerMap = filterListenerMap(interaction.client as BotClient);

  // Caller provided an ID but it's invalid.
  if (listenerId && !listenerMap.get(listenerId)) {
    await interaction.reply({
      content: `There's no listener with cooldown with ID=\`${listenerId}\`!`,
      ephemeral: true,
    });
    return;
  }

  let response = "";

  // Caller provided a valid ID. Provide the dump for just that one listener.
  if (listenerId) {
    const listener = listenerMap.get(listenerId)!;
    const dump = listener.cooldown.dump()!;
    response = `__**${listenerId}** Cooldown__\n${dump}\n`;
  }
  // Otherwise provide the dumps for all listeners.
  else {
    for (const [id, listener] of listenerMap) {
      const dump = listener.cooldown.dump();
      if (dump !== null)
        response += `__**${id}** Cooldown__\n${dump}\n`;
    }

    if (!response) {
      response = (
        "The bot isn't listening for anything that could have a cooldown " +
        "at the moment!"
      );
    }
  }

  await interaction.reply({
    content: response,
    ephemeral: !broadcast,
    allowedMentions: { parse: [] }, // Suppress mention pinging.
  });
});

const setCooldown = new Command(new SlashCommandBuilder()
  .setName(`set-listener-cooldown`)
  .setDescription("Set the cooldown spec for the a message creation listener.")
  .addStringOption(input => input
    .setName("listener")
    .setDescription("Listener ID.")
    .setRequired(true)
    .setAutocomplete(true)
  )
  .addStringOption(input => input
    .setName("type")
    .setDescription("Cooldown type.")
    .setRequired(true)
    .addChoices(
      { name: "Global", value: "global" },
      { name: "Per-user", value: "user" },
      { name: "Disabled", value: "disabled" },
    )
  )
  .addNumberOption(input => input
    .setName("seconds")
    .setDescription("Default duration of cooldown (in seconds).")
    .setMinValue(0)
  ),
  { broadcastOption: true },
);

setCooldown.check(checkPrivilege(RoleLevel.DEV));
setCooldown.autocomplete(listenerIdAutocomplete);
setCooldown.execute(async (interaction) => {
  const options = interaction.options as CommandInteractionOptionResolver;
  const broadcast = options.getBoolean("options") ?? false;
  const listenerId = options.getString("listener", true);

  const listenerMap = filterListenerMap(interaction.client as BotClient);
  const listener = listenerMap.get(listenerId);
  if (!listener) {
    await interaction.reply({
      content: `There's no listener with cooldown with ID=\`${listenerId}\`!`,
      ephemeral: true,
    });
    return;
  }

  const type = options.getString("type", true) as CooldownSpec["type"];

  if (type === "disabled") {
    listener.cooldown.update({ type: "disabled" });
    await interaction.reply({
      content: `Disabled cooldown for **${listenerId}**!`,
      ephemeral: !broadcast,
    });
    return;
  }

  const seconds = options.getNumber("seconds");
  if (seconds === null) {
    await interaction.reply({
      content: "Specify a value for the default cooldown duration!",
      ephemeral: true,
    });
    return;
  }

  if (type === "global") {
    listener.cooldown.update({ type: "global", seconds });
  } else if (type === "user") {
    listener.cooldown.update({ type: "user", defaultSeconds: seconds });
  }

  const response = `Updated **${listenerId}** cooldown spec:\n` +
    toBulletedList([
      `Type: \`${type}\``,
      `Default duration: ${formatHoursMinsSeconds(seconds)}`,
    ]);
  await interaction.reply({ content: response, ephemeral: !broadcast });
});

const overrideCooldown = new Command(new SlashCommandBuilder()
  .setName(`override-listener-cooldown`)
  .setDescription(`Set cooldown overrides for a message creation listener.`)
  .addStringOption(input => input
    .setName("listener")
    .setDescription("Listener ID.")
    .setRequired(true)
    .setAutocomplete(true)
  )
  .addMentionableOption(input => input
    .setName("mentionable")
    // TODO: supporting roles mean that the underlying list of members with
    // overrides can easily explode in size, likely making the current
    // implementation of /cooldowns (which returns an unpaginated text
    // response) error out from exceeded message length limit.
    .setDescription("Member or role to set overrides for.")
    .setRequired(true)
  )
  .addNumberOption(input => input
    .setName("duration")
    .setDescription(
      "User-specific cooldown duration override " +
      "(in seconds) (USER type cooldown only)."
    )
    .setMinValue(0)
  )
  .addBooleanOption(input => input
    .setName("bypass")
    .setDescription("Allow this user to bypass cooldown duration.")
  ),
  { broadcastOption: true },
);

overrideCooldown.check(checkPrivilege(RoleLevel.DEV));
overrideCooldown.autocomplete(listenerIdAutocomplete);
overrideCooldown.execute(async (interaction) => {
  const options = interaction.options as CommandInteractionOptionResolver;
  const broadcast = options.getBoolean("broadcast") ?? false;
  const listenerId = options.getString("listener", true);

  const listenerMap = filterListenerMap(interaction.client as BotClient);
  const listener = listenerMap.get(listenerId);
  if (!listener) {
    await interaction.reply({
      content: `There's no listener with cooldown with ID=\`${listenerId}\`!`,
      ephemeral: true,
    });
    return;
  }

  const { cooldown } = listener;

  if (cooldown.type === "disabled") {
    await interaction.reply({
      content: `Cooldown for **${listenerId}** is currently disabled!`,
      ephemeral: true,
    });
    return;
  }

  const mentionable
    = options.getMentionable("mentionable", true) as GuildMember | Role;
  const members = getAllMembers(mentionable);

  const duration = options.getNumber("duration");
  const bypass = options.getBoolean("bypass");

  if (duration !== null && bypass !== null) {
    await interaction.reply({
      content: "Provide a duration or bypass value but not both!",
      ephemeral: true,
    });
    return;
  }

  if (duration !== null) {
    if (cooldown.type !== "user") {
      await interaction.reply({
        content: "`duration` is only compatible with `user` cooldown type.",
        ephemeral: true,
      });
      return;
    }
    for (const member of members)
      cooldown.setDuration(duration, member.id);
    await interaction.reply({
      content:
        `Set **${listenerId}** cooldown duration override for ` +
        `${mentionable}: ${formatHoursMinsSeconds(duration)}.`,
      ephemeral: !broadcast,
      // TODO: Maybe make a replySilently overload for interactions.
      allowedMentions: { parse: [] },
    });
    return;
  }

  if (bypass !== null) {
    for (const member of members)
      cooldown.setBypass(bypass, member.id);
    await interaction.reply({
      content:
        `${bypass ? "Enabled" : "Disabled"} **${listenerId}** bypass ` +
        `for ${mentionable}.`,
      ephemeral: !broadcast,
      allowedMentions: { parse: [] },
    });
    return;
  }

  await interaction.reply({
    content: "Missing argument(s)!",
    ephemeral: true,
  });
});

const controller = new Controller({
  name: "cooldowns",
  commands: [listCooldowns, setCooldown, overrideCooldown],
  listeners: [],
});

export default controller;
