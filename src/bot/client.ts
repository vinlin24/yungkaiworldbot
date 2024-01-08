import path from "node:path";

import { ClientEvents, Collection, REST, Routes } from "discord.js";

import config from "../config";
import getLogger from "../logger";
import { IClientWithIntentsAndRunners } from "../types/client.abc";
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

export class BotClient extends IClientWithIntentsAndRunners {
  public override readonly commandRunners
    = new Collection<string, CommandRunner>();
  public override readonly listenerRunners
    = new Collection<string, ListenerRunner<any>>();

  private commandLoader = new CommandLoader(CONTROLLERS_DIR_PATH);
  private listenerLoader = new ListenerLoader(
    CONTROLLERS_DIR_PATH,
    SPECIAL_LISTENERS_DIR_PATH,
  );

  public prepareRuntime(): boolean {
    this.loadCommands();
    this.loadListeners();

    try {
      this.registerListeners();
      return true;
    } catch (error) {
      if (error instanceof DuplicateListenerIDError) {
        log.error(`duplicate listener ID: ${error.duplicateId}`);
      } else {
        log.crit(`unexpected error in registering events: ${error}`);
        console.error(error);
      }
      return false;
    }
  }

  public async deploySlashCommands(): Promise<void> {
    this.loadCommands();
    const commandsJSON = this.commandRunners.map(r => r.getDeployJSON());

    const { BOT_TOKEN, APPLICATION_ID, YUNG_KAI_WORLD_GID } = config;
    const rest = new REST().setToken(BOT_TOKEN);

    try {
      log.info(
        `started refreshing ${commandsJSON.length} application (/) commands.`
      );

      // The put method is used to fully refresh all commands in the guild with
      // the current set.
      const data = await rest.put(
        Routes.applicationGuildCommands(APPLICATION_ID, YUNG_KAI_WORLD_GID),
        { body: commandsJSON },
      ) as unknown[];

      log.info(
        `successfully reloaded ${data.length} application (/) commands.`
      );
    } catch (error) {
      log.crit("failed to refresh application commands.");
      console.error(error);
    }
  }

  private loadCommands(): void {
    const commandSpecs = this.commandLoader.load();
    for (const spec of commandSpecs) {
      const commandName = spec.definition.name;
      this.commandRunners.set(commandName, new CommandRunner(spec));
      log.debug(`imported command module for /${commandName}.`);
    }
  }

  private loadListeners(): void {
    const allListenerSpecs = this.listenerLoader.load()
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
}

/**
 * Singleton bot to use when starting the bot runtime normally or deploying
 * slash commands.
 */
export default new BotClient();
