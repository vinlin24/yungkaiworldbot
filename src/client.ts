import fs from "node:fs";
import path from "node:path";

import {
  Client,
  Collection,
  GatewayIntentBits,
  REST,
  Routes,
} from "discord.js";

import config from "./config";
import getLogger from "./logger";
import {
  Command,
  Controller,
  DuplicateListenerIDError,
  Listener,
} from "./types/controller.types";

const log = getLogger(__filename);

/** Path to the directory containing global event listener specs. */
const EVENTS_DIR_PATH = path.join(__dirname, "events");

/** Path to the directory containing controller specs. */
const CONTROLLERS_DIR_PATH = path.join(__dirname, "controllers");

export class BotClient extends Client {
  public readonly controllers = new Collection<string, Controller>();
  public readonly commands = new Collection<string, Command>();
  // `listeners` is already a property (inherited from EventEmitter).
  public readonly listenerSpecs = new Collection<string, Listener<any>>();

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });
  }

  public prepareRuntime(): boolean {
    try {
      this.loadControllers();
      this.registerEvents();
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
    this.loadControllers();
    const commandsJSON = this.commands.map(command => command.toDeployJSON());

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

  private discoverControllerFiles(directory: string): string[] {
    const controllerFiles: string[] = [];
    const contents = fs.readdirSync(directory);
    for (const file of contents) {
      const fullPath = path.join(directory, file);
      if (fs.lstatSync(fullPath).isDirectory()) {
        controllerFiles.push(...this.discoverControllerFiles(fullPath));
        continue;
      }
      if (file.endsWith(".controller.js") || file.endsWith(".controller.ts")) {
        controllerFiles.push(fullPath);
        log.debug(
          "discovered controller file: " +
          `${path.relative(CONTROLLERS_DIR_PATH, fullPath)}.`
        );
      }
    }
    return controllerFiles;
  }

  private loadControllers(): void {
    log.info(`discovering controller modules under ${CONTROLLERS_DIR_PATH}...`);
    const controllerFiles = this.discoverControllerFiles(CONTROLLERS_DIR_PATH);
    log.info(`discovered ${controllerFiles.length} controller modules.`);

    for (const file of controllerFiles) {
      const controller = require(file).default as Controller;
      // TODO: Maybe add a runtime validation that controller matches the
      // Controller schema. Maybe use a library like Zod?
      log.debug(`imported controller module '${controller.name}'.`);

      this.controllers.set(controller.name, controller);

      // Also set the commands mapping for easy retrieval by command name.
      for (const command of controller.commands) {
        this.commands.set(command.commandName, command);
      }
      log.debug(
        `registered ${controller.commands.length} command specs ` +
        `from controller module '${controller.name}'.`
      );
    }
  }

  private registerEvents(): void {
    // Register the events that come in controller modules. Precondition:
    // loadControllers() initialized this.controllers.
    for (const [name, controller] of this.controllers) {
      for (const listener of controller.listeners) {
        listener.register(this);
      }
      log.debug(
        `registered ${controller.listeners.length} event listener specs ` +
        `from controller '${name}'.`
      )
    }

    // Register the global standalone events.
    const eventFiles = fs.readdirSync(EVENTS_DIR_PATH)
      .filter(file => file.endsWith(".js") || file.endsWith(".ts"));
    for (const file of eventFiles) {
      const filePath = path.join(EVENTS_DIR_PATH, file);
      const listener = require(filePath).default as Listener<any>;
      listener.register(this);
    }
    log.info(
      `registered ${eventFiles.length} global event listener specs ` +
      `from ${EVENTS_DIR_PATH}.`
    );
  }
};

export default new BotClient();
