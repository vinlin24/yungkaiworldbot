import {
  Awaitable,
  CommandInteraction,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  SlashCommandBuilder,
} from "discord.js";

import getLogger from "../logger";
import { formatContext } from "../utils/logging.utils";

const log = getLogger(__filename);

export type CommandCheckFunction =
  (interaction: CommandInteraction) => Awaitable<boolean>;

export type CommandCheckFailHandler =
  (interaction: CommandInteraction) => Awaitable<void>;

export type CommandCheckErrorHandler =
  (interaction: CommandInteraction, error: Error) => Awaitable<void>;

export type CommandExecuteFunction =
  (interaction: CommandInteraction) => Awaitable<void>;

export type CommandErrorHandler =
  (interaction: CommandInteraction, error: Error) => Awaitable<void>;

export type CommandCheck = {
  predicate: CommandCheckFunction;
  onFail?: CommandCheckFailHandler;
  onError?: CommandCheckErrorHandler;
};

export class Command {
  private checks: CommandCheck[] = [];
  private callback: CommandExecuteFunction | null = null;
  private errorHandler: CommandErrorHandler | null = null;
  constructor(private slashCommandData: Partial<SlashCommandBuilder>) { }

  public get commandName(): string {
    return this.slashCommandData.name!;
  }

  public check(check: CommandCheck): Command {
    this.checks.push(check);
    return this;
  }

  public execute(func: CommandExecuteFunction): Command {
    this.callback = func;
    return this;
  }

  public catch(handler: CommandErrorHandler): Command {
    this.errorHandler = handler;
    return this;
  }

  public toDeployJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody {
    return this.slashCommandData.toJSON?.()!;
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    const context = formatContext(interaction);
    log.debug(`${context}: processing command.`);

    // Checks: run predicate
    //    -> success: move onto Execute
    //    -> fail: onFail ?? handleCommandError, short-circuit
    //        -> error: handleCommandError
    //    -> error: onError ?? handleCommandError, short-circuit
    //        -> error: handleCommandError
    // Execute: run callback
    //    -> success: return
    //    -> error: errorHandler ?? handleCommandError
    //        -> error: handleCommandError

    const passedChecks = await this.runChecks(interaction);
    if (!passedChecks)
      return;
    await this.runCallback(interaction);
    log.debug(`${context}: finished processing command.`);
  }

  private async runChecks(interaction: CommandInteraction): Promise<boolean> {
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

    const runErrorHandler = async (
      error: Error,
      onError?: CommandErrorHandler | CommandCheckErrorHandler,
    ) => {
      if (onError) {
        try {
          log.debug(`${context}: running checks's custom error handler...`);
          await onError(interaction, error);
          log.debug(`${context}: custom check error handler returned normally`);
        } catch (error) {
          log.error(
            `${context}: error in check error handler, ` +
            "falling back to global command error handler."
          );
          await this.handleCommandError(interaction, error as Error);
        }
      }
    };

    for (const [index, check] of this.checks.entries()) {
      const { predicate, onFail, onError } = check;

      let checkPassed;
      try {
        checkPassed = await predicate(interaction);
      } catch (error) {
        log.error(`${context}: check (position ${index}) errored.`);
        await runErrorHandler(error as Error, onError);
        return false; // Short-circuit.
      }

      if (!checkPassed) {
        log.debug(`${context}: check (position ${index}) returned failure.`);
        await runFailHandler(onFail);
        return false; // Short-circuit.
      }
    }

    return true;
  }

  private async runCallback(interaction: CommandInteraction): Promise<void> {
    const context = formatContext(interaction);

    if (!this.callback) {
      log.warn(`${context}: no \`execute\` provided, using generic response.`);
      await interaction.reply({ content: "👍", ephemeral: true });
      return;
    }

    try {
      await this.callback(interaction);
    } catch (error) {
      log.error(`${context}: error in command execute callback.`);
      if (this.errorHandler) {
        try {
          log.debug(`${context}: running command's custom error handler...`);
          await this.errorHandler(interaction, error as Error);
          log.debug(`${context}: custom error handler returned normally.`);
        } catch (error) {
          log.error(
            `${context}: error in command error handler, ` +
            "falling back to global command error handler."
          );
          await this.handleCommandError(interaction, error as Error);
        }
      } else {
        await this.handleCommandError(interaction, error as Error);
      }
    }
  }

  private async handleCommandError(
    interaction: CommandInteraction,
    error: Error,
  ): Promise<void> {
    console.error(error);
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
