import { ClientEvents } from "discord.js";

import getLogger from "../logger";
import { isReactionBlocked } from "../types/errors.types";
import { ListenerSpec } from "../types/listener.types";

const log = getLogger(__filename);

export class ListenerRunner<Type extends keyof ClientEvents> {
  constructor(public readonly spec: ListenerSpec<Type>) { }

  /**
   * Save one instance of the bound handleEvent callback such that we can remove
   * it later from the client if needed.
   *
   * NOTE: Not sure if this works. Haven't tested.
   */
  private boundEventListener = this.handleEvent.bind(this);
  public get callbackToRegister() { return this.boundEventListener; }

  protected async handleEvent(...args: ClientEvents[Type]): Promise<void> {
    /**
     * LISTENER EXECUTION PIPELINE
     * ---------------------------
     * Filters: run predicate
     *    -> success: move onto Execute
     *    -> fail: run onFail if provided, short-circuit
     *        -> error: handleListenerError, short-circuit
     *    -> error: handleListenerError, short-circuit
     * Execute: run execute
     *    -> success: move onto Cleanup
     *    -> error: handleListenerError, return
     * Cleanup: run all afterExecute hooks of filters
     *    -> success: return
     *    -> error: handleListenerError, DON'T short-circuit
     */

    await this.runFilters(...args)
      && await this.runCallback(...args)
      && await this.runCleanups(...args);
  }

  protected async runFilters(...args: ClientEvents[Type]): Promise<boolean> {
    if (!this.spec.filters) return true;
    for (const [index, filter] of this.spec.filters.entries()) {
      const { predicate, onFail } = filter;

      // Run the provided predicate and keep looping if no failures/errors.
      try {
        const passed = await predicate(...args);
        if (passed) continue;
      }
      catch (error) {
        log.error(
          `error in predicate of ${this.spec.id} listener filter` +
          `(position ${index}), counting as failure.`,
        );
        this.handleListenerError(error as Error);
        return false;
      }

      // Otherwise, run the fail handler if provided and return false.
      if (onFail) {
        try {
          await onFail(...args);
        }
        catch (error) {
          log.error(
            `error in fail handler of ${this.spec.id} listener filter ` +
            `(position ${index}).`,
          );
          this.handleListenerError(error as Error);
        }
      }
      return false;
    }
    return true;
  }

  protected async runCallback(...args: ClientEvents[Type]): Promise<boolean> {
    try {
      const success = await this.spec.execute(...args);
      // Listeners that decide not to return a flag treated as always success.
      return success ?? true;
    }
    catch (error) {
      log.error(`error in ${this.spec.id} listener callback.`);
      this.handleListenerError(error as Error);
      return false;
    }
  }

  protected async runCleanups(...args: ClientEvents[Type]): Promise<void> {
    if (!this.spec.filters) return;

    for (const [index, filter] of this.spec.filters.entries()) {
      const { afterExecute } = filter;
      if (!afterExecute) continue;
      try {
        await afterExecute(...args);
      }
      catch (error) {
        log.error(`listener post-execute hook (position ${index}) errored.`);
        await this.handleListenerError(error as Error);
        // DON'T short circuit. Since the execute callback succeeded, give all
        // filters a chance to run their post-hook cleanup.
      }
    }
  }

  protected handleListenerError(error: Error): void {
    if (isReactionBlocked(error)) {
      // TODO: Maybe define a helper function that all controllers can use to
      // react to a message such that errors can still be handled in one place
      // but can have access to the message's context.
      log.warning("reaction blocked.");
    }
    // Extend the if-else ladder for other error types to specially handle.
    else {
      console.error(error);
    }

  }
}
