// >> THIS MODULE IS WHAT MAKE SLASH COMMANDS POSSIBLE. <<

// Remember that command invocations are themselves a type of event,
// `Events.InteractionCreate`. This listener handles these events and dispatches
// the correct command runner.

import { Events, Interaction } from "discord.js";

import getLogger from "../../logger";
import { ListenerBuilder, ListenerSpec } from "../../types/listener.types";
import { BotClient } from "../client";

const log = getLogger(__filename);

async function dispatchCommand(interaction: Interaction): Promise<void> {
  if (!interaction.isChatInputCommand() && !interaction.isAutocomplete()) {
    return;
  }

  const client = interaction.client as BotClient;
  const commandName = interaction.commandName;
  const runner = client.commandRunners.get(commandName);

  if (!runner) {
    log.error(`no command named '${commandName}' found.`);
    return;
  }

  if (interaction.isChatInputCommand()) {
    try {
      await runner.run(interaction);
    }
    catch (error) {
      log.crit("unexpected error in command dispatch pipeline.");
      console.error(error);
    }
  }
  else if (interaction.isAutocomplete()) {
    try {
      await runner.resolveAutocomplete(interaction);
    }
    catch (error) {
      log.crit("unexpected error in autocomplete dispatch pipeline.");
      console.error(error);
    }
  }
}

/**
 * This listener is, from the POV of a discord.js consumer, the first point of
 * contact from Discord. The callback receives the interaction from Discord and:
 *
 * 1. Determines the type of interaction.
 * 2. Fetches the command the interaction corresponds to.
 * 3. Delegates resolution to the command's runner.
 *
 * Overall, the flow of execution goes from:
 *
 * 1. `COMMAND-DISPATCHER` (this event listener).
 * 2. The `CommandRunner` for the command.
 * 3. The `CommandSpec` used to initialize the `CommandRunner`.
 * 4. The callbacks within `CommandSpec`, defined in controller files.
 */
const commandDispatcherSpec: ListenerSpec<Events.InteractionCreate>
  = new ListenerBuilder(Events.InteractionCreate)
    .setId("COMMAND-DISPATCHER")
    .execute(dispatchCommand)
    .toSpec();

export default commandDispatcherSpec;
