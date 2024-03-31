import { AutocompleteInteraction, Events } from "discord.js";

import { BotClient } from "../../../bot/client";
import cooldownService from "../../../services/cooldown.service";

export async function listenerIdAutocomplete(
  interaction: AutocompleteInteraction,
): Promise<void> {
  const focusedValue = interaction.options.getFocused();
  const client = interaction.client as BotClient;

  const listenersMap = client.getListenerSpecs(Events.MessageCreate);
  const listenersWithCD = listenersMap.filter(listener => {
    const manager = cooldownService.getManager(listener.id);
    return manager && manager.type !== "disabled";
  });

  const choiceObjs = listenersWithCD
    .filter(({ id }) => id.startsWith(focusedValue))
    .map(({ id }) => ({ name: id, value: id }));
  await interaction.respond(choiceObjs);
}
