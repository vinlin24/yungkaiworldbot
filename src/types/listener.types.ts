import {
  Awaitable,
  Client,
  ClientEvents,
  Events
} from "discord.js";

import getLogger from "../logger";
import { addDateSeconds } from "../utils/dates.utils";

const log = getLogger(__filename);

// NOTE: This type parameter magic is to imitate what's done in
// discord.js/typings/index.ts to make Client.once and Client.on work with our
// custom EventSpec type.
export type ListenerExecuteFunction<Event extends keyof ClientEvents> =
  (...args: ClientEvents[Event]) => Awaitable<void>;

export type ListenerFilter<Event extends keyof ClientEvents> =
  (...args: ClientEvents[Event]) => Awaitable<boolean>;

export type ListenerOptions<Event extends keyof ClientEvents> = {
  name: Event,
  once?: boolean,
};

export class Listener<Event extends keyof ClientEvents> {
  private filters: ListenerFilter<Event>[] = [];
  private callback: ListenerExecuteFunction<Event> | null = null;
  private cooldownSecs: number | null = null;

  private name: Event;
  private once: boolean;

  private cooldownExpiration = new Date(0);

  constructor(options: ListenerOptions<Event>) {
    this.name = options.name;
    this.once = options.once ?? false;
  }

  public filter(predicate: ListenerFilter<Event>): Listener<Event> {
    this.filters.push(predicate);
    return this;
  }

  public execute(func: ListenerExecuteFunction<Event>): Listener<Event> {
    this.callback = func;
    return this;
  }

  public get cooldown(): number | null {
    return this.cooldownSecs;
  }

  public set cooldown(seconds: number | null) {
    if (seconds !== null && seconds < 0) {
      log.error(
        `tried to set listener cooldown with negative seconds (${seconds}).`
      );
      throw new RangeError(`seconds must be non-negative, received ${seconds}`);
    }
    this.cooldownSecs = seconds;
    if (seconds === null) {
      log.info("listener cooldown explicitly disabled (set to null).");
    }
  }

  /**
   * Return whether the cooldown is still active at the given time. If no time
   * is given, the current time is used. If no cooldown is enabled in the first
   * place, return false.
   */
  public cooldownActive(time?: Date): boolean {
    if (this.cooldown === null)
      return false; // Cooldown isn't enabled in the first place.
    time = time ?? new Date();
    return time < this.cooldownExpiration;
  }

  public register(client: Client): void {
    if (!this.callback) {
      log.warn(
        `no \`execute\` provided for event spec (name='${this.name}'), ` +
        "registration ignored."
      );
      return;
    }

    const handleEvent = async (...args: ClientEvents[Event]) => {
      const now = new Date();
      if (this.cooldownActive(now))
        return;

      // Specially enforce this policy: the bot is under no circumstances
      // allowed to listen to its own message creations. This is a simple way to
      // prevent accidental recursive spam without having to explicitly filter
      // by message author in every event listener implementation.
      if (this.name === Events.MessageCreate) {
        const [message] = args as ClientEvents[Events.MessageCreate];
        if (message.author.id === client.user!.id)
          return;
      }

      // Filters -> Execute.
      for (const [index, predicate] of this.filters.entries()) {
        try {
          const passed = await predicate(...args);
          if (!passed)
            return;
        } catch (error) {
          log.error(
            `error in ${this.name} listener filter (position ${index}), ` +
            "counting as failure."
          );
          this.handleListenerError(error as Error);
          return;
        }
      }
      try {
        this.callback!(...args);
      } catch (error) {
        // TODO: maybe somehow attach some kind of name/ID to Events so debug
        // messages can provide better context.
        log.error(`error in ${this.name} listener callback.`);
        this.handleListenerError(error as Error);
        return;
      }

      if (this.cooldown !== null) {
        this.cooldownExpiration = addDateSeconds(now, this.cooldown);
        log.debug(
          `listener cooldown updated to ${this.cooldownExpiration} ` +
          `(${this.cooldown} seconds from start of processing).`
        );
      }
    };

    if (this.once) {
      client.once(this.name, handleEvent);
    } else {
      client.on(this.name, handleEvent);
    }
  }

  protected handleListenerError(error: Error): void {
    console.error(error);
  }
}
