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
import { CommandSpec } from "./types/command.types";
import { EventSpec } from "./types/event.types";

const COMMANDS_DIR_PATH = path.join(__dirname, "commands");
const EVENTS_DIR_PATH = path.join(__dirname, "events");

export class BotClient extends Client {
  commands = new Collection<string, CommandSpec>();

  constructor() {
    super({
      intents: GatewayIntentBits.Guilds,
    });
  }

  public loadModules(): void {
    this.loadCommands();
    this.loadEvents();
  }

  public async syncCommands(): Promise<void> {
    this.loadCommands();
    const commandsJSON = this.commands.map(spec => spec.data.toJSON?.());

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
      console.error(error);
    }
  }

  private loadCommands(): void {
    let subfolders: string[];
    try {
      subfolders = fs.readdirSync(COMMANDS_DIR_PATH);
    } catch (error) {
      console.error(`Failed to load from ${COMMANDS_DIR_PATH}: ${error}`);
      return;
    }

    for (const folder of subfolders) {
      const subfolderPath = path.join(COMMANDS_DIR_PATH, folder);

      const commandFiles = fs.readdirSync(subfolderPath)
        .filter(file => file.endsWith(".js") || file.endsWith(".ts"));

      for (const file of commandFiles) {
        const filePath = path.join(subfolderPath, file);
        const command: CommandSpec = require(filePath).default;
        this.commands.set(command.data.name!, command);
      }

      log.info(
        `loaded ${commandFiles.length} command files from ${subfolderPath}.`
      );
    }
  }

  private loadEvents(): void {
    let eventFiles: string[];
    try {
      eventFiles = fs.readdirSync(EVENTS_DIR_PATH)
        .filter(file => file.endsWith(".js") || file.endsWith(".ts"));
    } catch (error) {
      console.error(`Failed to load from ${EVENTS_DIR_PATH}: ${error}`);
      return;
    }

    for (const file of eventFiles) {
      const filePath = path.join(EVENTS_DIR_PATH, file);
      const event: EventSpec<any> = require(filePath).default;

      if (event.once) {
        this.once(event.name, (...args) => event.execute(...args));
      } else {
        this.on(event.name, (...args) => event.execute(...args));
      }

      log.info(`loaded event file ${file}.`);
    }
  }
};

export default new BotClient();
