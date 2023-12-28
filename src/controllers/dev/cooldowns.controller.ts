import {
  CommandInteractionOptionResolver,
  SlashCommandBuilder,
} from "discord.js";

import { BotClient } from "../../client";
import {
  RoleLevel,
  checkPrivilege,
} from "../../middleware/privilege.middleware";
import {
  Command,
  Controller,
  MessageListener,
} from "../../types/controller.types";

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
listCooldowns.execute(async (interaction) => {
  const options = interaction.options as CommandInteractionOptionResolver;
  const broadcast = options.getBoolean("broadcast");
  const listenerId = options.getString("listener");

  const client = interaction.client as BotClient;
  const listenerMap = client.listenerSpecs
    .filter(listener => listener instanceof MessageListener)
    .mapValues(listener => listener as MessageListener);

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

listCooldowns.autocomplete(async (interaction) => {
  const focusedValue = interaction.options.getFocused();

  const listeners = (interaction.client as BotClient).listenerSpecs;
  const listenersWithCD = listeners
    .filter(l => l instanceof MessageListener)
    .map(l => l as MessageListener)
    .filter(l => l.cooldown.type !== "disabled");
  const choiceObjs = listenersWithCD
    .map(l => l.id)
    .filter(id => id.startsWith(focusedValue))
    .map(id => ({ name: id, value: id }));

  await interaction.respond(choiceObjs);
});

const controller = new Controller({
  name: "cooldowns",
  commands: [listCooldowns],
  listeners: [],
});

export default controller;
