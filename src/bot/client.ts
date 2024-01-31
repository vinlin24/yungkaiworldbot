import path from "node:path";

import { ClientEvents, Collection, REST, Routes } from "discord.js";

import env, { YUNG_KAI_WORLD_GID } from "../config";
import getLogger from "../logger";
import { ClientWithIntentsAndRunnersABC } from "../types/client.abc";
import {
  DuplicateListenerIDError,
  ListenerSpec,
} from "../types/listener.types";
import { CommandLoader } from "./command.loader";
import { CommandRunner } from "./command.runner";
import { ListenerLoader } from "./listener.loader";
import { ListenerRunner } from "./listener.runner";

const log = getLogger(__filename);

/**
 * Path to the directory containing controller specs.
 */
const CONTROLLERS_DIR_PATH = path.join(__dirname, "..", "controllers");

/**
 * Path to the directory containing event listener specs special to the bot
 * itself.
 */
const SPECIAL_LISTENERS_DIR_PATH = path.join(__dirname, "listeners");

export class BotClient extends ClientWithIntentsAndRunnersABC {
  private commandLoader = new CommandLoader(CONTROLLERS_DIR_PATH);
  private listenerLoader = new ListenerLoader(
    CONTROLLERS_DIR_PATH,
    SPECIAL_LISTENERS_DIR_PATH,
  );

  public override async prepareRuntime(
    disableListeners = false,
  ): Promise<boolean> {
    await this.loadCommands();
    await this.loadListeners(disableListeners);

    try {
      this.registerListeners();
      return true;
    }
    catch (error) {
      if (error instanceof DuplicateListenerIDError) {
        log.error(`duplicate listener ID: ${error.duplicateId}`);
      }
      else {
        log.crit(`unexpected error in registering events: ${error}`);
        console.error(error);
      }
      return false;
    }
  }

  public override async deploySlashCommands(): Promise<void> {
    await this.loadCommands();
    const commandsJSON = this.commandRunners.map(r => r.getDeployJSON());

    const { BOT_TOKEN, APPLICATION_ID } = env;
    const rest = new REST().setToken(BOT_TOKEN);

    try {
      log.info(
        `started refreshing ${commandsJSON.length} application (/) commands.`,
      );

      // The put method is used to fully refresh all commands in the guild with
      // the current set.
      const data = await rest.put(
        Routes.applicationGuildCommands(APPLICATION_ID, YUNG_KAI_WORLD_GID),
        { body: commandsJSON },
      ) as unknown[];

      log.info(
        `successfully reloaded ${data.length} application (/) commands.`,
      );
    }
    catch (error) {
      log.crit("failed to refresh application commands.");
      console.error(error);
    }
  }

  private async loadCommands(): Promise<void> {
    const commandSpecs = await this.commandLoader.load();
    for (const spec of commandSpecs) {
      const commandName = spec.definition.name;
      this.commandRunners.set(commandName, new CommandRunner(spec));
      log.debug(`imported command module for /${commandName}.`);
    }
  }

  private async loadListeners(specialOnly?: boolean): Promise<void> {
    const allListenerSpecs = await this.listenerLoader.load(specialOnly);
    for (const spec of allListenerSpecs) {
      const { id, type } = spec;
      this.listenerRunners.set(id, new ListenerRunner(spec));
      log.debug(`imported ${type} listener module ID=${id}.`);
    }
  }

  public getListenerSpecs<Type extends keyof ClientEvents>(type?: Type)
    : Collection<string, ListenerSpec<Type>> {
    const asSpecs = this.listenerRunners.mapValues(runner => runner.spec);
    if (!type) return asSpecs;
    return asSpecs.filter(spec => spec.type === type);
  }

  public override async clearDefinitions(): Promise<void> {
    // Clear the command mapping. Unlike for listeners, there's no "undoing
    // registration" since commands and synced to Discord's backend. Instead,
    // our command runner should intelligently handle commands that may be valid
    // from Discord's POV but not from our runner's POV>
    const numCommands = this.commandRunners.size;
    this.commandRunners.clear();
    log.warning(`removed ${numCommands} commands from client mapping.`);

    // Undo callback registration before clearing the mapping.
    for (const runner of this.listenerRunners.values()) {
      this.removeListener(runner.spec.type, runner.callbackToRegister);
    }
    const numListeners = this.listenerRunners.size;
    this.listenerRunners.clear();
    log.warning(`removed ${numListeners} listeners from client mapping.`);
  }
}

/**
 * Singleton bot to use when starting the bot runtime normally or deploying
 * slash commands.
 */
export default new BotClient();
