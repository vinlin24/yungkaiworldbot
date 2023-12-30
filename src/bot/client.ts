import fs from "node:fs";
import path from "node:path";

import { Collection, REST, Routes } from "discord.js";

import config from "../config";
import getLogger from "../logger";
import { IClientWithIntentsAndRunners } from "../types/client.abc";
import { CommandSpec } from "../types/command.types";
import {
  DuplicateListenerIDError,
  ListenerSpec,
} from "../types/listener.types";
import { CommandRunner } from "./command.runner";
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

  public prepareRuntime(): boolean {
    const [
      commandPaths,
      listenerPaths,
    ] = this.discoverControllerFiles(CONTROLLERS_DIR_PATH);

    try {
      this.loadCommands(commandPaths);
      this.loadListeners(listenerPaths);
      this.registerListeners();
      return true;
    } catch (error) {
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

  public async deploySlashCommands(): Promise<void> {
    const [commandPaths] = this.discoverControllerFiles(CONTROLLERS_DIR_PATH);
    this.loadCommands(commandPaths);

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

  private loadCommands(commandPaths: string[]): void {
    for (const fullPath of commandPaths) {
      const commandSpec = require(fullPath).default as CommandSpec;
      // TODO: Maybe add a runtime validation that controller matches the
      // Controller schema. Maybe use a library like Zod?
      const commandName = commandSpec.definition.name;
      log.debug(`imported command module for /${commandName}.`);

      this.commandRunners.set(commandName, new CommandRunner(commandSpec));
    }
  }

  private loadListeners(listenerPaths: string[]): void {
    // Discover the listeners special to the bot itself and prepend their paths
    // to the controller listener paths.
    const specialListenerPaths: string[] = [];
    const contents = fs.readdirSync(SPECIAL_LISTENERS_DIR_PATH);
    for (const file of contents) {
      const fullPath = path.join(SPECIAL_LISTENERS_DIR_PATH, file);
      specialListenerPaths.push(fullPath);
      log.debug(`discovered special event listener file: ${file}.`);
    }
    const allListenerPaths = [...specialListenerPaths, ...listenerPaths];

    for (const fullPath of allListenerPaths) {
      const listenerSpec = require(fullPath).default as ListenerSpec<any>;
      // TODO: Maybe add a runtime validation that controller matches the
      // Controller schema. Maybe use a library like Zod?
      const { id, type } = listenerSpec;
      log.debug(`imported ${type} listener module ID=${id}.`);

      this.listenerRunners.set(id, new ListenerRunner(listenerSpec));
    }
  }

  private discoverControllerFiles(directory: string): [
    commandPaths: string[],
    listenerPaths: string[],
  ] {
    const commandPaths: string[] = [];
    const listenerPaths: string[] = [];

    const contents = fs.readdirSync(directory);
    for (const file of contents) {
      const fullPath = path.join(directory, file);

      // Recursive case: file is a directory.
      if (fs.lstatSync(fullPath).isDirectory()) {
        const [
          innerCommandPaths,
          innerListenerPaths,
        ] = this.discoverControllerFiles(fullPath);
        commandPaths.push(...innerCommandPaths);
        listenerPaths.push(...innerListenerPaths);
        continue;
      }

      // Base case: file is a controller file.
      if (file.endsWith(".command.js") || file.endsWith("command.ts")) {
        commandPaths.push(fullPath);
        log.debug(
          "discovered command implementation file: " +
          `${path.relative(CONTROLLERS_DIR_PATH, fullPath)}.`
        );
        continue;
      }
      if (file.endsWith(".listener.js") || file.endsWith("listener.ts")) {
        listenerPaths.push(fullPath);
        log.debug(
          "discovered listener implementation file: " +
          `${path.relative(CONTROLLERS_DIR_PATH, fullPath)}.`
        );
        continue;
      }
    }

    return [commandPaths, listenerPaths];
  }
}

export default new BotClient();
