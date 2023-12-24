import {
  Awaitable,
  Client,
  ClientEvents,
  Events,
  Message,
} from "discord.js";
import lodash from "lodash";

import getLogger from "../logger";
import { addDateSeconds } from "../utils/dates.utils";
import { toUserMention } from "../utils/markdown.utils";

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

    // Specially enforce this policy: the bot is under no circumstances
    // allowed to listen to its own message creations. This is a simple way to
    // prevent accidental recursive spam without having to explicitly filter
    // by message author in every event listener implementation.
    if (this.name === Events.MessageCreate) {
      const ignoreSelf: ListenerFilter<Events.MessageCreate> =
        message => message.author.id !== client.user!.id;
      (this.filters as ListenerFilter<Events.MessageCreate>[]).push(ignoreSelf);
    }

    if (this.once) {
      client.once(this.name, this.handleEvent.bind(this));
    } else {
      client.on(this.name, this.handleEvent.bind(this));
    }
  }

  protected async handleEvent(...args: ClientEvents[Event]) {
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
  };

  protected handleListenerError(error: Error): void {
    console.error(error);
  }
}

export type CooldownSpec = {
  type: "global" | "user";
  seconds: number;
} | {
  type: "dynamic";
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
export class MessageListener
  extends Listener<Events.MessageCreate>
{
  private cooldownSpec: CooldownSpec = { type: "disabled" };
  // Used for global cooldown type.
  private globalCooldownExpiration = new Date(0);
  // Used for user and dynamic cooldown type.
  private cooldownExpirations = new Map<string, Date>();

  constructor() {
    super({ name: Events.MessageCreate, once: false });
  }

  public get cooldownType(): CooldownSpec["type"] {
    return this.cooldownSpec.type;
  }

  public cooldown = (spec: CooldownSpec): MessageListener => {
    // Copy to allow support for changing properties of the spec later. NOTE:
    // native support for structuredClone() requires Node 17+.
    this.cooldownSpec = lodash.cloneDeep(spec);
    // When switching specs, invalidate current expirations.
    this.globalCooldownExpiration = new Date(0);
    this.cooldownExpirations.clear();
    return this;
  };

  public setCooldown(seconds: number): void;
  public setCooldown(seconds: number, userId: string): void;
  public setCooldown(seconds: number, userId?: string): void {
    if (userId === undefined) {
      this.setNonDynamicCooldown(seconds);
    } else {
      this.setDynamicCooldown(seconds, userId);
    }
  }

  private setDynamicCooldown = (seconds: number, userId: string) => {
    if (this.cooldownSpec.type !== "dynamic") {
      const message = (
        "attempted to set dynamic cooldown duration on non-dynamic " +
        `cooldown type (type=${this.cooldownSpec.type})`
      );
      log.error(`${message}.`);
      throw new Error(message);
    }

    if (!this.cooldownSpec.userSeconds)
      this.cooldownSpec.userSeconds = new Map();
    this.cooldownSpec.userSeconds.set(userId, seconds);
    log.info(
      "set dynamic cooldown duration for " +
      `${toUserMention(userId)} to ${seconds}.`
    );
  };

  private setNonDynamicCooldown = (seconds: number) => {
    if (this.cooldownSpec.type === "disabled") {
      const message = (
        "attempted to set cooldown duration on listener with disabled cooldown"
      );
      log.error(`${message}.`);
      throw new Error(message);
    }

    if (this.cooldownSpec.type === "dynamic") {
      this.cooldownSpec.defaultSeconds = seconds;
      log.info(`set default dynamic cooldown duration to ${seconds}.`);
    } else {
      this.cooldownSpec.seconds = seconds;
      log.info(
        `set ${this.cooldownSpec.type} cooldown duration to ${seconds}.`
      );
    }
  };

  protected override async handleEvent(message: Message) {
    // Return (don't handle the event) if we're currently on cooldown.
    const now = new Date();
    const authorId = message.author.id;
    switch (this.cooldownType) {
      case "disabled":
        break;
      case "global":
        if (now < this.globalCooldownExpiration) return;
        break;
      case "user":
      case "dynamic":
        const expiration = this.cooldownExpirations.get(authorId);
        if (expiration && now < expiration) return;
        break;
    }

    super.handleEvent(message);

    // Update cooldowns appropriately.
    let expiration: Date;
    switch (this.cooldownSpec.type) {
      case "disabled":
        return;
      case "global":
        expiration = addDateSeconds(now, this.cooldownSpec.seconds);
        this.globalCooldownExpiration = expiration;
        return;
      case "user":
        expiration = addDateSeconds(now, this.cooldownSpec.seconds);
        this.cooldownExpirations.set(authorId, expiration);
        return;
      case "dynamic":
        const duration =
          this.cooldownSpec.userSeconds?.get(authorId)
          ?? this.cooldownSpec.defaultSeconds;
        expiration = addDateSeconds(now, duration);
        this.cooldownExpirations.set(authorId, expiration);
        return;
    }
  }
}
