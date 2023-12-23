import {
  Awaitable,
  Client,
  ClientEvents,
  Events,
} from "discord.js";

import getLogger from "../logger";

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
  private name: Event;
  private once: boolean;

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

  public register(client: Client): void {
    if (!this.callback) {
      log.warn(
        `no \`execute\` provided for event spec (name='${this.name}'), ` +
        "registration ignored."
      );
      return;
    }

    const handleEvent = async (...args: ClientEvents[Event]) => {
      // Specially enforce this policy: the bot is under no circumstances
      // allowed to listen to its own message creations. This is a simple way to
      // prevent accidental recursive spam without having to explicitly filter
      // by message author in every event listener implementation.
      if (this.name === Events.MessageCreate) {
        const [message] = args as ClientEvents[Events.MessageCreate];
        if (message.author.id === client.user!.id)
          return;
      }

      // filters -> execute.
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
      }
    };

    if (this.once) {
      client.once(this.name, handleEvent);
    } else {
      client.on(this.name, handleEvent);
    }
  }

  private handleListenerError(error: Error): void {
    console.error(error);
  }
}
