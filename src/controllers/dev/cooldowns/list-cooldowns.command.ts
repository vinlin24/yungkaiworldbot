import { Events, SlashCommandBuilder } from "discord.js";


import { BotClient } from "../../../bot/client";
import {
  RoleLevel,
  checkPrivilege,
} from "../../../middleware/privilege.middleware";
import { CommandBuilder } from "../../../types/command.types";
import { addBroadcastOption } from "../../../utils/options.utils";
import { listenerIdAutocomplete } from "./cooldowns.autocomplete";

/**
 * Return a partial copy of the client's listener spec mapping with only the
 * listeners that are instances of `MessageListener`.
 */
// function filterListenerMap(client: BotClient)
//   : Collection<string, MessageListener> {
//   return client.listenerSpecs
//     .filter(listener => listener instanceof MessageListener)
//     .mapValues(listener => listener as MessageListener);
// }


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

listCooldowns.check(checkPrivilege(RoleLevel.DEV)); // TEMP.

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

  let response = "";

  // Caller provided a valid ID. Provide the dump for just that one listener.
  if (listenerId) {
    const listener = listenerMap.get(listenerId)!;
    const dump = listener.cooldown?.dump() ?? "(disabled)";
    response = `__**${listenerId}** Cooldown__\n${dump}\n`;
  }
  // Otherwise provide the dumps for all listeners.
  else {
    for (const [id, listener] of listenerMap) {
      const dump = listener.cooldown?.dump();
      if (dump !== null && dump !== undefined)
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

const listCooldownsSpec = listCooldowns.toSpec();
export default listCooldownsSpec;
