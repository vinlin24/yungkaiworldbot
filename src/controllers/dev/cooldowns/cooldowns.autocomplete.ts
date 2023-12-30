import { AutocompleteInteraction, Events } from "discord.js";
import { BotClient } from "../../../bot/client";

export async function listenerIdAutocomplete(
  interaction: AutocompleteInteraction,
): Promise<void> {
  const focusedValue = interaction.options.getFocused();
  const client = interaction.client as BotClient;

  const listenersMap = client.getListenerSpecs(Events.MessageCreate);
  const listenersWithCD = listenersMap.filter(
    l => l.cooldown && l.cooldown.type !== "disabled"
  );
  const choiceObjs = listenersWithCD
    .filter(({ id }) => id.startsWith(focusedValue))
    .map(({ id }) => ({ name: id, value: id }));

  await interaction.respond(choiceObjs);
}
