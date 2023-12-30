import { Client, ClientEvents, Events } from "discord.js";

import getLogger from "../logger";
import { ClientWithDispatchers } from "../types/client.types";
import {
  DuplicateListenerIDError,
  ListenerFilterType,
  ListenerSpec,
  toCompleteFilter,
} from "../types/listener.types";

const log = getLogger(__filename);

export class ListenerDispatcher<Type extends keyof ClientEvents> {
  /**
   * Save one instance of the bound handleEvent callback such that we can remove
   * it later from the client if needed.
   *
   * NOTE: Not sure if this works. Haven't tested.
   */
  private boundEventListener = this.handleEvent.bind(this);

  constructor(public readonly spec: ListenerSpec<Type>) { }

  public toString(): string {
    const className = `${this.constructor.name}<'${this.spec.type}'>`;
    const properties = `id='${this.spec.id}', once=${this.spec.once}`;
    return `${className}(${properties})`;
  }

  public register(client: ClientWithDispatchers): void {
    // Specially enforce this policy: the bot is under no circumstances
    // allowed to listen to its own message creations. This is a simple way to
    // prevent accidental recursive spam without having to explicitly filter
    // by message author in every event listener implementation.
    if (this.spec.type === Events.MessageCreate) {
      const ignoreSelf: ListenerFilterType<Events.MessageCreate> = {
        predicate: message => message.author.id !== client.user!.id,
      };
      // These mf type gymnastics should NOT need to be done. Using type guards
      // i.e. `this is ListenerDispatcher<Events.MessageCreate>` doesn't work
      // either. For some reason, TS never picks up that "Type" is
      // Events.MessageCreate in this control flow.
      if (!this.spec.filters) {
        this.spec.filters = [ignoreSelf] as ListenerFilterType<Type>[];
      } else {
        this.spec.filters.push(ignoreSelf as ListenerFilterType<Type>);
      }
    }

    // Add to listeners collection for easy retrieval later.
    if (client.listenerDispatchers.get(this.spec.id)) {
      throw new DuplicateListenerIDError(this.spec.id);
    }
    client.listenerDispatchers.set(this.spec.id, this);

    // The actual registration.
    if (this.spec.once) {
      client.once(this.spec.type, this.boundEventListener);
    } else {
      client.on(this.spec.type, this.boundEventListener);
    }
    log.debug(`registered event spec ${this}.`);
  }

  public unregister(client: Client): void {
    const callback =
      (this.boundEventListener as unknown) as (...args: any[]) => void;
    client.removeListener(this.spec.type, callback);
  }

  protected async runFilters(...args: ClientEvents[Type]): Promise<boolean> {
    if (!this.spec.filters) return true;
    for (const [index, filter] of this.spec.filters.entries()) {
      const { predicate, onFail } = toCompleteFilter(filter);

      // Run the provided predicate and keep looping if no failures/errors.
      try {
        const passed = await predicate(...args);
        if (passed) continue;
      } catch (error) {
        log.error(
          `error in predicate of ${this.spec.id} listener filter` +
          `(position ${index}), counting as failure.`
        );
        this.handleListenerError(error as Error);
        return false;
      }

      // Otherwise, run the fail handler if provided and return false.
      if (onFail) {
        try {
          await onFail(...args);
        } catch (error) {
          log.error(
            `error in fail handler of ${this.spec.id} listener filter ` +
            `(position ${index}).`
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
    } catch (error) {
      log.error(`error in ${this.spec.id} listener callback.`);
      this.handleListenerError(error as Error);
      return false;
    }
  }

  protected async runCleanups(...args: ClientEvents[Type]): Promise<void> {
    if (!this.spec.filters) return;

    for (const [index, filter] of this.spec.filters.entries()) {
      const { afterExecute } = toCompleteFilter(filter);
      if (!afterExecute) continue;
      try {
        await afterExecute(...args);
      } catch (error) {
        log.error(`listener post-execute hook (position ${index}) errored.`);
        await this.handleListenerError(error as Error);
        // DON'T short circuit. Since the execute callback succeeded, give all
        // filters a chance to run their post-hook cleanup.
      }
    }
  }

  protected async handleEvent(...args: ClientEvents[Type]): Promise<void> {
    await this.runFilters(...args)
      && await this.runCallback(...args)
      && await this.runCleanups(...args);
  };

  protected handleListenerError(error: Error): void {
    console.error(error);
  }
}

/**
 * Specialized listener for message creations. This listener also supports
 * automatically handling cooldowns of different types. The listener will ignore
 * messages (all messages or messages from specific users) during cooldown.
 */
// export class MessageListener extends ListenerDispatcher<Events.MessageCreate> {
//   public readonly cooldown = new CooldownManager();

//   constructor(id: string) {
//     super({ type: Events.MessageCreate, id, once: false });
//   }

//   protected override async handleEvent(message: Message) {
//     // Filters -> Check Cooldown -> Callback -> Update Cooldown.

//     const passedFilters = await super.runFilters(message);
//     if (!passedFilters) return;

//     if (this.cooldown.isActive(message)) {
//       try {
//         await this.cooldown.onCooldown?.(message);
//       } catch (error) {
//         const context = formatContext(message);
//         log.error(`${context}: error in cooldown callback of ${this}.`);
//         super.handleListenerError(error as Error);
//       }
//       return;
//     };

//     const success = await super.runCallback(message);
//     if (!success) return;

//     this.cooldown.refresh(message);
//   }
// }
