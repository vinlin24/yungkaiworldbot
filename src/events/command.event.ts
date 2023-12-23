import { Events } from "discord.js";

import { BotClient } from "../client";
import log from "../logger";
import { Listener } from "../types/module.types";
import { formatContext } from "../utils/logging.utils";

const commandDispatcher = new Listener<Events.InteractionCreate>({
  name: Events.InteractionCreate,
});

commandDispatcher.execute(async (interaction) => {
  if (!interaction.isChatInputCommand())
    return;

  const client = interaction.client as BotClient;
  const commandName = interaction.commandName;
  const command = client.commands.get(commandName);

  const context = formatContext(interaction);

  if (!command) {
    log.error(`${context}: no command found.`);
    return;
  }

  try {
    await command.run(interaction);
  } catch (error) {
    log.crit("unexpected error in command dispatch pipeline.");
    console.error(error);
  }
});

export default commandDispatcher;
