import { Events } from "discord.js";

import { BotClient } from "../client";
import getLogger from "../logger";
import { Listener } from "../types/controller.types";

const log = getLogger(__filename);

const commandDispatcher = new Listener<Events.InteractionCreate>({
  name: Events.InteractionCreate,
  id: "COMMAND-DISPATCH", // Uppercase convention for global listeners I guess.
});

commandDispatcher.execute(async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isAutocomplete())
    return;

  const client = interaction.client as BotClient;
  const commandName = interaction.commandName;
  const command = client.commands.get(commandName);

  if (!command) {
    log.error(`no command named '${commandName}' found.`);
    return;
  }

  if (interaction.isChatInputCommand()) {
    try {
      await command.run(interaction);
    } catch (error) {
      log.crit("unexpected error in command dispatch pipeline.");
      console.error(error);
    }
  } else if (interaction.isAutocomplete()) {
    try {
      await command.resolveAutocomplete(interaction);
    } catch (error) {
      log.crit("unexpected error in autocomplete dispatch pipeline.");
    }
  }
});

export default commandDispatcher;
