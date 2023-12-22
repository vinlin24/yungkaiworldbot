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
import log from "./logger";
import { CommandSpec, EventSpec, ModuleSpec } from "./types/spec.types";

const EVENTS_DIR_PATH = path.join(__dirname, "events");
const MODULES_DIR_PATH = path.join(__dirname, "modules");

export class BotClient extends Client {
  public readonly modules = new Collection<string, ModuleSpec>();
  public readonly commands = new Collection<string, CommandSpec>();

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

  public loadModules(): void {
    this.loadModuleSpecs();
    this.registerEvents();
  }

  public async syncCommands(): Promise<void> {
    this.loadModuleSpecs();
    const commandsJSON = this.commands.map(spec => spec.toDeployJSON());

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

  private loadModuleSpecs(): void {
    let subfolders: string[];
    try {
      subfolders = fs.readdirSync(MODULES_DIR_PATH);
    } catch (error) {
      log.crit(`failed to load from ${MODULES_DIR_PATH}: ${error}`);
      return;
    }
    log.info(
      `detected ${subfolders.length} subfolders under ${MODULES_DIR_PATH}.`
    );

    for (const folder of subfolders) {
      const subfolderPath = path.join(MODULES_DIR_PATH, folder);

      const moduleFiles = fs.readdirSync(subfolderPath)
        .filter(file => file.endsWith(".js") || file.endsWith(".ts"));

      log.info(
        `importing ${moduleFiles.length} module specs from ` +
        `${path.basename(subfolderPath).toUpperCase()}...`
      );

      for (const file of moduleFiles) {
        const filePath = path.join(subfolderPath, file);
        const moduleSpec = require(filePath).default as ModuleSpec;
        this.modules.set(moduleSpec.name, moduleSpec);
        log.info(`imported module '${moduleSpec.name}'.`);

        // Also set the commands mapping for easy retrieval by command name.
        for (const commandSpec of moduleSpec.commands) {
          this.commands.set(commandSpec.commandName, commandSpec);
        }
        log.debug(
          `registered ${moduleSpec.commands.length} command specs ` +
          `from module '${moduleSpec.name}'.`
        );
      }
    }
  }

  private registerEvents(): void {
    // Register the events that come in modules.
    for (const [name, moduleSpec] of this.modules) {
      for (const eventSpec of moduleSpec.events) {
        eventSpec.register(this);
      }
      log.debug(
        `registered ${moduleSpec.events.length} event specs ` +
        `from module '${name}'.`
      )
    }

    // Register the global standalone events.
    const eventFiles = fs.readdirSync(EVENTS_DIR_PATH)
      .filter(file => file.endsWith(".js") || file.endsWith(".ts"));
    for (const file of eventFiles) {
      const filePath = path.join(EVENTS_DIR_PATH, file);
      const eventSpec = require(filePath).default as EventSpec<any>;
      eventSpec.register(this);
    }
    log.info(
      `registered ${eventFiles.length} global event specs ` +
      `from ${EVENTS_DIR_PATH}.`
    );
  }
};

export default new BotClient();
