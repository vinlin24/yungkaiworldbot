import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";

import getLogger from "../logger";
import { CommandCheckFailHandler, CommandSpec } from "../types/command.types";
import { formatContext } from "../utils/logging.utils";

const log = getLogger(__filename);

export class CommandRunner {
  constructor(public readonly spec: CommandSpec) { }

  public getDeployJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody {
    return this.spec.definition;
  }

  public async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const context = formatContext(interaction);
    log.debug(`${context}: processing command.`);

    /**
     * COMMAND EXECUTION PIPELINE
     * --------------------------
     * Checks: run predicate
     *    -> success: move onto Execute
     *    -> fail: run onFail if provided, short-circuit
     *        -> error: handleCommandError, short-circuit
     *    -> error: handleCommandError, short-circuit
     * Execute: run execute
     *    -> success: move onto Cleanup
     *    -> error: handleCommandError, return
     * Cleanup: run all afterExecute hooks of checks
     *    -> success: return
     *    -> error: handleCommandError, DON'T short-circuit
     */

    const passedChecks = await this.runChecks(interaction);
    if (!passedChecks) return;
    const success = await this.runExecute(interaction);
    if (success) await this.runCleanups(interaction);

    // Ensure that the user never sees "Application did not respond" if we can
    // help it.
    if (!interaction.replied) {
      log.warning(
        `${context}: execute didn't reply to interaction, ` +
        "using generic response."
      );
      await interaction.reply({ content: "👍", ephemeral: true });
    }

    log.debug(`${context}: finished executing command.`);
  }

  public async resolveAutocomplete(
    interaction: AutocompleteInteraction,
  ): Promise<void> {
    const context = formatContext(interaction);
    if (!this.spec.autocomplete) {
      log.warning(`${context}: no handler to resolve autocomplete.`);
      return;
    }
    log.debug(`${context}: processing autocomplete.`);
    await this.spec.autocomplete(interaction); // TODO: error handling.
    log.debug(`${context}: finished processing autocomplete.`);
  }

  protected async runChecks(
    interaction: ChatInputCommandInteraction,
  ): Promise<boolean> {
    if (!this.spec.checks) return true;
    const context = formatContext(interaction);

    const runFailHandler = async (onFail: CommandCheckFailHandler) => {
      try {
        await onFail(interaction);
      } catch (error) {
        log.error(`${context}: error in check fail handler.`);
        await this.handleCommandError(interaction, error as Error);
      }
    };

    for (const [index, check] of this.spec.checks.entries()) {
      const { predicate, onFail } = check;

      let checkPassed;
      try {
        checkPassed = await predicate(interaction);
      } catch (error) {
        log.error(`${context}: check (position ${index}) errored.`);
        await this.handleCommandError(interaction, error as Error);
        return false; // Short-circuit.
      }

      if (!checkPassed) {
        log.debug(`${context}: check (position ${index}) returned failure.`);
        if (onFail) await runFailHandler(onFail);
        return false; // Short-circuit.
      }
    }

    return true;
  }

  protected async runExecute(
    interaction: ChatInputCommandInteraction,
  ): Promise<boolean> {
    const context = formatContext(interaction);

    let success: boolean;
    try {
      const flag = await this.spec.execute(interaction);
      // Commands that decide not to return a flag treated as always succeeding.
      success = flag ?? true;
      log.debug(`${context}: finished command callback, success=${success}.`);
    } catch (error) {
      log.error(`${context}: error in command execute callback.`);
      await this.handleCommandError(interaction, error as Error);
      return false;
    }

    return success;
  }

  protected async runCleanups(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    if (!this.spec.checks) return;
    const context = formatContext(interaction);

    for (const [index, check] of this.spec.checks.entries()) {
      const { afterExecute } = check;
      if (!afterExecute) continue;
      try {
        await afterExecute(interaction);
      } catch (error) {
        log.error(
          `${context}: command post-execute hook (position ${index}) errored.`
        );
        await this.handleCommandError(interaction, error as Error);
        // DON'T short-circuit. Since the execute callback succeeded, give all
        // checks a chance to run their post-hook cleanup.
      }
    }
  }

  protected async handleCommandError(
    interaction: ChatInputCommandInteraction,
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
