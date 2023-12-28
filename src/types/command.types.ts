import {
  AutocompleteInteraction,
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

export type CommandAutocompleteHandler =
  (interaction: AutocompleteInteraction) => Awaitable<void>;

export type CommandCheck = {
  predicate: CommandCheckFunction;
  onFail?: CommandCheckFailHandler;
  onError?: CommandCheckErrorHandler;
};

export type CommandOptions = {
  /**
   * Whether to insert a broadcast flag in the options for this command.
   * Commands with this option are expected to default to responding
   * ephemerally, with the broadcast option providing the choice to make
   * responses public.
   */
  broadcastOption?: boolean,
  /**
   * Whether to insert an ephemeral flag in the options for this command.
   * Commands with this option are expected to default to responding publicly,
   * with the ephemeral option providing the choice to make responses ephemeral.
   */
  ephemeralOption?: boolean;
};

export class Command {
  private checks: CommandCheck[] = [];
  private callback: CommandExecuteFunction | null = null;
  private errorHandler: CommandErrorHandler | null = null;
  private autocompleteHandler: CommandAutocompleteHandler | null = null;
  constructor(
    private slashCommandData: Partial<SlashCommandBuilder>,
    private options?: CommandOptions,
  ) {
    this.processOptions();
  }

  private processOptions(): void {
    const broadcast = !!this.options?.broadcastOption;
    const ephemeral = !!this.options?.ephemeralOption;

    if (broadcast && ephemeral) {
      const message = "broadcast and ephemeral options are mutually exclusive";
      log.error(`${message}.`);
      throw new Error(message);
    }

    if (broadcast) {
      this.slashCommandData.addBooleanOption?.(input => input
        .setName("broadcast")
        .setDescription(
          "Whether to respond publicly instead of ephemerally."
        )
      );
    }

    if (ephemeral) {
      this.slashCommandData.addBooleanOption?.(input => input
        .setName("ephemeral")
        .setDescription(
          "Whether to make the response ephemeral instead of public."
        )
      );
    }
  }

  public get commandName(): string {
    return this.slashCommandData.name!;
  }

  public check(check: CommandCheck): this {
    this.checks.push(check);
    return this;
  }

  public execute(func: CommandExecuteFunction): this {
    this.callback = func;
    return this;
  }

  public catch(handler: CommandErrorHandler): this {
    this.errorHandler = handler;
    return this;
  }

  public autocomplete(handler: CommandAutocompleteHandler): this {
    this.autocompleteHandler = handler;
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

  public async resolveAutocomplete(interaction: AutocompleteInteraction) {
    const context = formatContext(interaction);
    if (!this.autocompleteHandler) {
      log.warning(`${context}: no handler to resolve autocomplete.`);
      return;
    }
    log.debug(`${context}: processing autocomplete.`);
    await this.autocompleteHandler(interaction); // TODO: error handling.
    log.debug(`${context}: finished processing autocomplete.`);
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
      log.warning(
        `${context}: no \`execute\` provided, using generic response.`
      );
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
