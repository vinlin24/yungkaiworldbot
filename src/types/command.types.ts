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

export type CommandExecuteFunction =
  (interaction: CommandInteraction) => Awaitable<void>;

export type CommandCheck = {
  check: CommandCheckFunction;
  onFail?: CommandCheckFailHandler;
};

export class Command {
  private prehooks: CommandCheck[] = [];
  private callback: CommandExecuteFunction | null = null;
  private posthooks: CommandExecuteFunction[] = [];
  constructor(private slashCommandData: Partial<SlashCommandBuilder>) { }

  public get commandName(): string {
    return this.slashCommandData.name!;
  }

  public prehook(hook: CommandCheck): Command {
    this.prehooks.push(hook);
    return this;
  }

  public execute(func: CommandExecuteFunction): Command {
    this.callback = func;
    return this;
  }

  public posthook(hook: CommandExecuteFunction): Command {
    this.posthooks.push(hook);
    return this;
  }

  public toDeployJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody {
    return this.slashCommandData.toJSON?.()!;
  }

  public async run(interaction: CommandInteraction): Promise<void> {
    const context = formatContext(interaction);
    log.debug(`${context}: processing command.`);

    // prehooks -> execute -> posthooks.
    const passedChecks = await this.runPrehooks(interaction);
    if (!passedChecks)
      return;
    const success = await this.runCallback(interaction);
    if (success)
      await this.runPosthooks(interaction);

    log.debug(`${context}: command processed successfully.`);
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
