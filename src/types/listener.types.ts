import {
  Awaitable,
  Client,
  ClientEvents,
  Events,
  Message,
} from "discord.js";

import { BotClient } from "../client";
import getLogger from "../logger";
import { CooldownManager } from "../middleware/cooldown.middleware";

const log = getLogger(__filename);

// NOTE: This type parameter magic is to imitate what's done in
// discord.js/typings/index.ts to make Client.once and Client.on work with our
// custom EventSpec type.
export type ListenerExecuteFunction<Event extends keyof ClientEvents> =
  (...args: ClientEvents[Event]) => Awaitable<boolean | void>;

export type ListenerFilter<Event extends keyof ClientEvents> =
  (...args: ClientEvents[Event]) => Awaitable<boolean>;

export type ListenerOptions<Event extends keyof ClientEvents> = {
  /** Type of events to listen to. */
  name: Event,
  /**
   * Unique name to identify this listener instance. This name will be used to
   * retrieve listeners and what is displayed for debugging purposes.
   */
  id: string,
  /**
   * Whether this listener should only listen once. Defaults to false
   * (continuously listen to events).
   */
  once?: boolean,
};

export class DuplicateListenerIDError extends Error {
  constructor(public readonly duplicateId: string) { super(duplicateId); }
}

export class Listener<Event extends keyof ClientEvents> {
  private filters: ListenerFilter<Event>[] = [];
  private callback: ListenerExecuteFunction<Event> | null = null;

  public readonly name: Event;
  public readonly id: string;
  public readonly once: boolean;

  /**
   * Save one instance of the bound handleEvent callback such that we can remove
   * it later from the client if needed.
   *
   * NOTE: Not sure if this works. Haven't tested.
   */
  private boundEventListener = this.handleEvent.bind(this);

  constructor(options: ListenerOptions<Event>) {
    this.name = options.name;
    this.id = options.id;
    this.once = options.once ?? false;
  }

  public toString = (): string => {
    const className = `${this.constructor.name}<'${this.name}'>`;
    const properties = `id='${this.id}', once=${this.once}`;
    return `${className}(${properties})`;
  };

  public filter(predicate: ListenerFilter<Event>): Listener<Event> {
    this.filters.push(predicate);
    return this;
  }

  public execute(func: ListenerExecuteFunction<Event>): Listener<Event> {
    this.callback = func;
    return this;
  }

  public register(client: BotClient): void {
    if (!this.callback) {
      log.warning(
        `no \`execute\` provided for event spec ${this}, registration ignored.`
      );
      return;
    }

    // Specially enforce this policy: the bot is under no circumstances
    // allowed to listen to its own message creations. This is a simple way to
    // prevent accidental recursive spam without having to explicitly filter
    // by message author in every event listener implementation.
    if (this.name === Events.MessageCreate) {
      const ignoreSelf: ListenerFilter<Events.MessageCreate> =
        message => message.author.id !== client.user!.id;
      (this.filters as ListenerFilter<Events.MessageCreate>[]).push(ignoreSelf);
    }

    // Add to listeners collection for easy retrieval later.
    if (client.listenerSpecs.get(this.id)) {
      throw new DuplicateListenerIDError(this.id);
    }
    client.listenerSpecs.set(this.id, this);

    // The actual registration.
    if (this.once) {
      client.once(this.name, this.boundEventListener);
    } else {
      client.on(this.name, this.boundEventListener);
    }
    log.info(`registered event spec ${this}.`);
  }

  public unregister(client: Client): void {
    const callback =
      (this.boundEventListener as unknown) as (...args: any[]) => void;
    client.removeListener(this.name, callback);
  }

  protected async runFilters(...args: ClientEvents[Event]): Promise<boolean> {
    for (const [index, predicate] of this.filters.entries()) {
      try {
        const passed = await predicate(...args);
        if (!passed)
          return false;
      } catch (error) {
        log.error(
          `error in ${this.name} listener filter (position ${index}), ` +
          "counting as failure."
        );
        this.handleListenerError(error as Error);
        return false;
      }
    }
    return true;
  }

  protected async runCallback(...args: ClientEvents[Event]): Promise<boolean> {
    try {
      const success = await this.callback!(...args);
      return success ?? true;
    } catch (error) {
      // TODO: maybe somehow attach some kind of name/ID to Events so debug
      // messages can provide better context.
      log.error(`error in ${this.name} listener callback.`);
      this.handleListenerError(error as Error);
      return false;
    }
  }

  protected async handleEvent(...args: ClientEvents[Event]): Promise<void> {
    await this.runFilters(...args) && await this.runCallback(...args);
  };

  protected handleListenerError(error: Error): void {
    console.error(error);
  }
}

export type CooldownSpec = {
  type: "global";
  seconds: number;
  bypassers?: Set<string>;
} | {
  type: "user";
  defaultSeconds: number;
  userSeconds?: Map<string, number>;
} | {
  type: "disabled";
};

/**
 * Specialized listener for message creations. This listener also supports
 * automatically handling cooldowns of different types. The listener will ignore
 * messages (all messages or messages from specific users) during cooldown.
 */
export class MessageListener extends Listener<Events.MessageCreate> {
  public readonly cooldown = new CooldownManager();

  constructor(id: string) {
    super({ name: Events.MessageCreate, id, once: false });
  }

  protected override async handleEvent(message: Message) {
    // Filters -> Check Cooldown -> Callback -> Update Cooldown.

    const passedFilters = await super.runFilters(message);
    if (!passedFilters) return;

    if (this.cooldown.isActive(message)) return;

    const success = await super.runCallback(message);
    if (!success) return;

    this.cooldown.refresh(message);
  }
}
