import {
  Awaitable,
  Client,
  ClientEvents,
} from "discord.js";

import log from "../logger";

// NOTE: This type parameter magic is to imitate what's done in
// discord.js/typings/index.ts to make Client.once and Client.on work with our
// custom EventSpec type.
export type ListenerExecuteFunction<Event extends keyof ClientEvents> =
  (...args: ClientEvents[Event]) => Awaitable<void>;

export type ListenerOptions<Event extends keyof ClientEvents> = {
  name: Event,
  once?: boolean,
};

export class Listener<Event extends keyof ClientEvents> {
  private callback: ListenerExecuteFunction<Event> | null = null;
  private name: Event;
  private once: boolean;

  constructor(options: ListenerOptions<Event>) {
    this.name = options.name;
    this.once = options.once ?? false;
  }

  // TODO: Maybe add a `filter` helper that registers a callback to use to
  // ignore events that meet/don't meet a certain predicate. This could be
  // useful as a way to define the "scope" of a listener (e.g. only listen to
  // messages from a certain channel).

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
    if (this.once) {
      client.once(this.name, (...args) => this.callback!(...args));
    } else {
      client.on(this.name, (...args) => this.callback!(...args));
    }
  }
}
