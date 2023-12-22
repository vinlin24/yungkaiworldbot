import {
  Awaitable,
  Client,
  ClientEvents,
  CommandInteraction,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  SlashCommandBuilder,
} from "discord.js";
import log from "../logger";
import { formatContext } from "../utils/logging.utils";

export type CommandCheckFunction =
  (interaction: CommandInteraction) => Awaitable<boolean>;

export type CommandCheckFailHandler =
  (interaction: CommandInteraction) => Awaitable<void>;

export type CommandExecuteFunction =
  (interaction: CommandInteraction) => Awaitable<void>;

export type CommandCheck = {
  check: CommandCheckFunction;
  onFail?: CommandCheckFailHandler;
};

// export type CommandSpec = {
//   privilege?: RoleLevel;
//   data: Partial<SlashCommandBuilder>;
//   execute: (interaction: CommandInteraction) => Awaitable<any>;
// } & (
//     | { check: CommandCheck; checks?: never; }
//     | { check?: never; checks: CommandCheck[]; }
//     | { check?: never; checks?: never; }
//   );

export class CommandSpec {
  private prehooks: CommandCheck[] = [];
  private callback: CommandExecuteFunction | null = null;
  private posthooks: CommandExecuteFunction[] = [];
  constructor(private data: Partial<SlashCommandBuilder>) { }

  public get commandName(): string {
    return this.data.name!;
  }

  public define(data: Partial<SlashCommandBuilder>): CommandSpec {
    this.data = data;
    return this;
  }

  public prehook(hook: CommandCheck): CommandSpec {
    this.prehooks.push(hook);
    return this;
  }

  public execute(func: CommandExecuteFunction): CommandSpec {
    this.callback = func;
    return this;
  }

  public posthook(hook: CommandExecuteFunction): CommandSpec {
    this.posthooks.push(hook);
    return this;
  }

  public toDeployJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody {
    return this.data.toJSON?.()!;
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    // prehooks -> execute -> posthooks.
    const passedChecks = await this.runPrehooks(interaction);
    if (!passedChecks)
      return;
    const success = await this.runCallback(interaction);
    if (success)
      await this.runPosthooks(interaction);
  }

  private async runPrehooks(interaction: CommandInteraction): Promise<boolean> {
    const context = formatContext(interaction);

    const runFailHandler = async (onFail?: CommandCheckFailHandler) => {
      if (onFail) {
        try {
          await onFail(interaction);
        } catch (error) {
          log.error(`${context}: error in check fail handler.`);
          await this.handleCommandError(interaction, error as Error);
        }
      }
    };

    for (const [index, { check, onFail }] of this.prehooks.entries()) {
      let checkPassed;
      try {
        checkPassed = await check(interaction);
      } catch (error) {
        log.error(
          `${context}: check (position ${index}) errored, counting as failure.`
        );
        await this.handleCommandError(interaction, error as Error);
        await runFailHandler(onFail);
        return false; // Short-circuit.
      }

      if (!checkPassed) {
        log.debug(`${context}: check (position ${index}) returned failure.`);
        runFailHandler(onFail);
        return false; // Short-circuit.
      }
    }

    return true;
  }

  private async runCallback(interaction: CommandInteraction): Promise<boolean> {
    const context = formatContext(interaction);

    if (!this.callback) {
      log.warn(`${context}: no \`execute\` provided, using generic response.`);
      await interaction.reply({ content: "👍", ephemeral: true });
      return true;
    }

    try {
      await this.callback(interaction);
    } catch (error) {
      log.error(`${context}: error in command execute callback.`);
      await this.handleCommandError(interaction, error as Error);
      return false;
    }

    return true;
  }

  private async runPosthooks(interaction: CommandInteraction): Promise<void> {
    const context = formatContext(interaction);

    for (const [index, hook] of this.posthooks.entries()) {
      try {
        await hook(interaction);
      } catch (error) {
        log.error(`${context}: error in posthook (position ${index}).`);
        await this.handleCommandError(interaction, error as Error);
        return; // Short-circuit.
      }
    }
  }

  private async handleCommandError(
    interaction: CommandInteraction,
    error: Error,
  ): Promise<void> {
    // TODO: Provide more useful responses.
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  }
}

// export type EventSpec<EventName extends keyof ClientEvents> = {
//   name: EventName;
//   once?: boolean;
//   execute: (...args: ClientEvents[EventName]) => Awaitable<any>;
// };


// NOTE: This type parameter magic is to imitate what's done in
// discord.js/typings/index.ts to make Client.once and Client.on work with our
// custom EventSpec type.
export type EventExecuteFunction<EventName extends keyof ClientEvents> =
  (...args: ClientEvents[EventName]) => Awaitable<void>;

export type EventSpecOptions<EventName extends keyof ClientEvents> = {
  name: EventName,
  once?: boolean,
};

export class EventSpec<EventName extends keyof ClientEvents> {
  private callback: EventExecuteFunction<EventName> | null = null;
  private name: EventName;
  private once: boolean;

  constructor(options: EventSpecOptions<EventName>) {
    this.name = options.name;
    this.once = options.once ?? false;
  }

  public execute(func: EventExecuteFunction<EventName>): EventSpec<EventName> {
    this.callback = func;
    return this;
  }

  public register(client: Client): void {
    if (!this.callback) {
      log.warn(
        `no \`execute\` provided for event spec (name='${this.name}'), ` +
        "registration ignored."
      );
      return;
    }
    if (this.once) {
      client.once(this.name, (...args) => this.callback!(...args));
    } else {
      client.on(this.name, (...args) => this.callback!(...args));
    }
  }
}

export type ModuleSpec = {
  name: string;
  commands: readonly CommandSpec[];
  events: readonly EventSpec<any>[];
};
