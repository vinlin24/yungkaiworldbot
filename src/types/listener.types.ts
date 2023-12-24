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
      this.setGlobalCooldown(seconds);
    } else {
      this.setUserCooldown(seconds, userId);
    }
  }

  public setCooldownBypass(bypass: boolean, userId: string): void {
    if (this.cooldownSpec.type === "disabled") {
      const message = (
        "attempted to set cooldown bypass on listener with disabled cooldown"
      );
      log.error(`${message}.`);
      throw new Error(message);
    }

    if (this.cooldownSpec.type === "global") {
      this.setGlobalCooldownBypass(bypass, userId);
    } else { // === "user"
      this.setUserCooldownBypass(bypass, userId);
    }
  }

  private setUserCooldown = (seconds: number, userId: string) => {
    if (this.cooldownSpec.type !== "user") {
      const message = (
        "attempted to set user cooldown duration on non-user " +
        `cooldown type (type=${this.cooldownSpec.type})`
      );
      log.error(`${message}.`);
      throw new Error(message);
    }

    if (!this.cooldownSpec.userSeconds)
      this.cooldownSpec.userSeconds = new Map();
    this.cooldownSpec.userSeconds.set(userId, seconds);
    log.info(
      "set user cooldown duration for " +
      `${toUserMention(userId)} to ${seconds}.`
    );
  };

  private setGlobalCooldown = (seconds: number) => {
    if (this.cooldownSpec.type === "disabled") {
      const message = (
        "attempted to set cooldown duration on listener with disabled cooldown"
      );
      log.error(`${message}.`);
      throw new Error(message);
    }

    if (this.cooldownSpec.type === "user") {
      this.cooldownSpec.defaultSeconds = seconds;
      log.info(`set DEFAULT user cooldown duration to ${seconds}.`);
    } else { // === "global"
      this.cooldownSpec.seconds = seconds;
      log.info(`set global cooldown duration to ${seconds}.`);
    }
  };

  private setGlobalCooldownBypass = (bypass: boolean, userId: string) => {
    if (this.cooldownSpec.type !== "global") // Pacify TS.
      throw new Error("unexpected call to setGlobalCooldownBypass");

    if (!this.cooldownSpec.bypassers)
      this.cooldownSpec.bypassers = new Set();

    if (bypass) {
      this.cooldownSpec.bypassers.add(userId);
      log.debug(
        `added ${toUserMention(userId)} to bypassers for listener ` +
        "with global cooldown type."
      );
    } else {
      this.cooldownSpec.bypassers.delete(userId);
      log.debug(
        `removed ${toUserMention(userId)} from bypassers for listener ` +
        "with global cooldown type."
      );
    }
  };

  private setUserCooldownBypass = (bypass: boolean, userId: string) => {
    if (this.cooldownSpec.type !== "user") // Pacify TS.
      throw new Error("unexpected call to setUserCooldownBypass");

    if (!this.cooldownSpec.userSeconds)
      this.cooldownSpec.userSeconds = new Map();

    if (bypass) {
      this.setUserCooldown(0, userId);
      return;
    }

    const mention = toUserMention(userId);
    const currentCooldown = this.cooldownSpec.userSeconds?.get(userId);
    // "Revoking bypass" only makes sense if the user already has a duration
    // associated with them and the duration is 0. In this case, just delete
    // them from the mapping overrides to effectively revert them to the
    // default duration.
    if (currentCooldown === 0) {
      this.cooldownSpec.userSeconds?.delete(userId);
      log.debug(
        `revoked bypass from ${mention} for listener ` +
        "with user cooldown type."
      );
    } else if (currentCooldown === undefined) {
      log.warn(
        `${mention} is already using default cooldown duration for ` +
        "listener with user cooldown type, revoking bypass does nothing."
      );
    } else { // currentCooldown > 0
      log.warn(
        `${mention} already has a nonzero cooldown duration override for ` +
        "listener with user cooldown type, revoking bypass does nothing."
      );
    }
  };

  protected override async handleEvent(message: Message) {
    // Return (don't handle the event) if we're currently on cooldown.
    const now = new Date();
    const authorId = message.author.id;
    switch (this.cooldownSpec.type) {
      case "disabled":
        break;
      case "global":
        // Bypass cooldown, proceed to handling event.
        if (this.cooldownSpec.bypassers?.has(authorId)) break;
        // Listener on cooldown.
        if (now < this.globalCooldownExpiration) return;
        break;
      case "user":
        const expiration = this.cooldownExpirations.get(authorId);
        if (expiration && now < expiration) return;
        break;
    }

    // NOTE: THIS DOESN'T WORK AS EXPECTED SOMETIMES. Cooldown checking should
    // be part of the filter process and not necessarily before all the other
    // filters (which are encapsulated inside handleEvent). For example, the
    // Klee dab listener should only care about cooldowns if all the filters
    // passed e.g. message is actually a dab, but since right now we check
    // cooldowns before any filters, there can be a case where a non-related
    // message updates the cooldown for a user without them even dabbing.

    super.handleEvent(message);

    // Update cooldowns appropriately.
    let expiration: Date;
    switch (this.cooldownSpec.type) {
      case "disabled":
        return;
      case "global":
        // Bypassers shouldn't interfere with the ongoing cooldown for others.
        if (this.cooldownSpec.bypassers?.has(authorId)) return;
        expiration = addDateSeconds(now, this.cooldownSpec.seconds);
        this.globalCooldownExpiration = expiration;
        return;
      case "user":
        const duration =
          this.cooldownSpec.userSeconds?.get(authorId)
          ?? this.cooldownSpec.defaultSeconds;
        expiration = addDateSeconds(now, duration);
        this.cooldownExpirations.set(authorId, expiration);
        return;
    }
  }
}
