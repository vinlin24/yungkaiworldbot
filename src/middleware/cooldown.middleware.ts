import {
  Awaitable,
  Events,
  Message,
} from "discord.js";
import lodash from "lodash";

import getLogger from "../logger";
import { ListenerFilter } from "../types/listener.types";
import { addDateSeconds, formatHoursMinsSeconds } from "../utils/dates.utils";
import {
  joinUserMentions,
  toBulletedList,
  toRelativeTimestampMention,
  toTimestampMention,
  toUserMention,
} from "../utils/markdown.utils";

const log = getLogger(__filename);

export type OnCooldownFunction = (message: Message) => Awaitable<void>;

export type GlobalCooldownSpec = {
  type: "global";
  seconds: number;
  onCooldown?: OnCooldownFunction;
};

export type PerUserCooldownSpec = {
  type: "user";
  defaultSeconds: number;
  onCooldown?: OnCooldownFunction;
};

export type DisabledCooldownSpec = {
  type: "disabled";
}

export type CooldownSpec =
  | GlobalCooldownSpec
  | PerUserCooldownSpec
  | DisabledCooldownSpec;

export class CooldownManager {
  /** The spec the manager is currently observing. */
  private spec: CooldownSpec = { type: "disabled" };

  /** User IDs for users that bypass global cooldown type. */
  private bypassers = new Set<string>();

  /** Per-user cooldown duration overrides for user cooldown type. */
  private durationOverrides = new Map<string, number>();

  /** Timestamp of cooldown expiration for global type cooldowns. */
  private globalExpiration = new Date(0);

  /** Per-user timestamps of cooldown expiration for user type cooldowns. */
  private userExpirations = new Map<string, Date>();

  constructor(initialSpec?: CooldownSpec) {
    if (initialSpec) this.set(initialSpec);
  }

  /**
   * Callback to run if the manager is queried and revealed to be on cooldown.
   */
  public get onCooldown(): OnCooldownFunction | null {
    if (this.spec.type === "disabled") return null;
    return this.spec.onCooldown ?? null;
  }

  /** The type of cooldown the manager is currently observing. */
  public get type(): CooldownSpec["type"] {
    return this.spec.type;
  }

  public clearCooldowns = (): void => {
    this.globalExpiration = new Date(0);
    this.userExpirations.clear();
  };

  /**
   * Return the IDs of the members that bypass cooldown.
   *
   * - This is empty if the cooldown type is disabled.
   * - This is simply the bypassers from the spec if the type is global.
   * - This is the members with duration override = 0 if the type is per-user.
   */
  public getBypassers = (): ReadonlySet<string> => {
    const emptySet = new Set<string>();
    switch (this.spec.type) {
      case "disabled":
        return emptySet;
      case "global":
        return this.bypassers;
      case "user":
        const idsWithDurationZero = Array
          .from(this.durationOverrides)
          .filter(([_, duration]) => duration === 0)
          .map(([memberId, _]) => memberId);
        return new Set(idsWithDurationZero);
    }
  }

  public set = (spec: CooldownSpec): void => {
    // Save bypassers. We can transfer them between cooldown types.
    const bypassers = this.getBypassers();

    // Copy to allow support for changing properties of the spec later. NOTE:
    // native support for structuredClone() requires Node 17+. Not sure if deep
    // cloning is need anymore now that Sets and Maps are stored on the
    // CooldownManager instead of the spec itself, but doesn't hurt (I think).
    this.spec = lodash.cloneDeep(spec);

    // When switching specs, invalidate current expirations.
    this.clearCooldowns();

    // Transfer bypassers.
    for (const memberId of bypassers) {
      this.setBypass(true, memberId);
    }
  };

  public update = (spec: Partial<CooldownSpec>): void => {
    if (!this.spec) {
      const message = "attempted to update a spec that hasn't been set yet";
      log.error(`${message}.`);
      throw new Error(message);
    }

    // Overwrite only the keys that are provided in the new spec.
    const updatedCompleteSpec = { ...this.spec, ...spec } as CooldownSpec;
    this.set(updatedCompleteSpec);
  }

  public setDuration(seconds: number): void;
  public setDuration(userId: string | undefined, seconds: number): void;
  public setDuration(arg1: number | string | undefined, arg2?: number): void {
    let userId: string | undefined;
    let seconds: number;

    // First overload: treat as global case.
    if (typeof arg1 === "number") {
      seconds = arg1;
      this.setGlobalDuration(seconds);
      return;
    }

    // Second overload: treat as per-user case.
    userId = arg1;
    seconds = arg2!;
    if (userId === undefined) {
      log.warning("undefined UID passed to setDuration, doing nothing.");
      return;
    }
    this.setUserDuration(seconds, userId);
  };

  public setBypass = (bypass: boolean, userId?: string): void => {
    if (userId === undefined) {
      log.warning("undefined UID passed to setBypass, doing nothing.");
      return;
    }

    if (this.spec.type === "disabled") {
      const message = (
        "attempted to set cooldown bypass on listener with disabled cooldown"
      );
      log.error(`${message}.`);
      throw new Error(message);
    }

    if (this.spec.type === "global") {
      this.setGlobalBypass(bypass, userId);
    } else { // === "user"
      this.setUserBypass(bypass, userId);
    }
  };

  private setUserDuration = (seconds: number, userId: string): void => {
    if (this.spec.type !== "user") {
      const message = (
        "attempted to set user cooldown duration on non-user " +
        `cooldown type (type=${this.spec.type})`
      );
      log.error(`${message}.`);
      throw new Error(message);
    }

    this.durationOverrides.set(userId, seconds);
    log.info(
      "set user cooldown duration for " +
      `${toUserMention(userId)} to ${seconds}.`
    );
  };

  private setGlobalDuration = (seconds: number): void => {
    if (this.spec.type === "disabled") {
      const message = (
        "attempted to set cooldown duration on listener with disabled cooldown"
      );
      log.error(`${message}.`);
      throw new Error(message);
    }

    if (this.spec.type === "user") {
      this.spec.defaultSeconds = seconds;
      log.info(`set DEFAULT user cooldown duration to ${seconds}.`);
    } else { // === "global"
      this.spec.seconds = seconds;
      log.info(`set global cooldown duration to ${seconds}.`);
    }
  };

  private setGlobalBypass = (bypass: boolean, userId: string): void => {
    if (this.spec.type !== "global") // Pacify TS.
      throw new Error("unexpected call to setGlobalCooldownBypass");

    if (bypass) {
      this.bypassers.add(userId);
      log.debug(
        `added ${toUserMention(userId)} to bypassers for listener ` +
        "with global cooldown type."
      );
    } else {
      this.bypassers.delete(userId);
      log.debug(
        `removed ${toUserMention(userId)} from bypassers for listener ` +
        "with global cooldown type."
      );
    }
  };

  private setUserBypass = (bypass: boolean, userId: string): void => {
    if (this.spec.type !== "user") // Pacify TS.
      throw new Error("unexpected call to setUserCooldownBypass");

    if (bypass) {
      this.setUserDuration(0, userId);
      this.userExpirations.delete(userId); // Invalidate current expiration.
      return;
    }

    const mention = toUserMention(userId);
    const currentCooldown = this.durationOverrides.get(userId);
    // "Revoking bypass" only makes sense if the user already has a duration
    // associated with them and the duration is 0. In this case, just delete
    // them from the mapping overrides to effectively revert them to the
    // default duration.
    if (currentCooldown === 0) {
      this.durationOverrides.delete(userId);
      log.debug(
        `revoked bypass from ${mention} for listener ` +
        "with user cooldown type."
      );
    } else if (currentCooldown === undefined) {
      log.warning(
        `${mention} is already using default cooldown duration for ` +
        "listener with user cooldown type, revoking bypass does nothing."
      );
    } else { // currentCooldown > 0
      log.warning(
        `${mention} already has a nonzero cooldown duration override for ` +
        "listener with user cooldown type, revoking bypass does nothing."
      );
    }
  };

  public isActive = (message: Message): boolean => {
    const now = new Date();
    const authorId = message.author.id;

    switch (this.spec.type) {
      case "disabled":
        return false;
      case "global":
        // Bypass cooldown, proceed to handling event.
        if (this.bypassers.has(authorId)) return false;
        // Listener on cooldown.
        if (now < this.globalExpiration) return true;;
        return false;
      case "user":
        const expiration = this.userExpirations.get(authorId);
        if (expiration && now < expiration) return true;
        return false;
    }
  };

  public refresh = (message: Message): void => {
    const now = new Date();
    const authorId = message.author.id;

    let expiration: Date;
    switch (this.spec.type) {
      case "disabled":
        return;
      case "global":
        // Bypassers shouldn't interfere with the ongoing cooldown for others.
        if (this.bypassers.has(authorId)) return;
        expiration = addDateSeconds(now, this.spec.seconds);
        this.globalExpiration = expiration;
        return;
      case "user":
        const duration =
          this.durationOverrides.get(authorId)
          ?? this.spec.defaultSeconds;
        expiration = addDateSeconds(now, duration);
        this.userExpirations.set(authorId, expiration);
        return;
    }
  };

  /**
   * @deprecated Separate application layer logic from presentation layer. Maybe
   * return some serialized form of cooldown state as an object, and let the
   * caller be the one to format what to send on Discord.
   */
  public dump = (): string | null => {
    const now = new Date();
    let result: string;

    function formatStatus(expiration: Date): string {
      if (now >= expiration)
        return "Inactive ✅";
      const mention = toTimestampMention(expiration);
      const relativeMention = toRelativeTimestampMention(expiration);
      return `Active until ${mention} (${relativeMention}) ⌛`;
    }

    if (this.spec.type === "global") {
      const bypasserMentions = joinUserMentions(this.bypassers);
      result = toBulletedList([
        "**Type:** GLOBAL",
        `**Status:** ${formatStatus(this.globalExpiration)}`,
        `**Duration:** ${formatHoursMinsSeconds(this.spec.seconds)}`,
        `**Bypassers:** ${bypasserMentions || "(none)"}`,
      ]);
      return result;
    }

    if (this.spec.type === "user") {
      const statuses: string[] = [];
      for (const [userId, expiration] of this.userExpirations.entries()) {
        const mention = toUserMention(userId);
        statuses.push(`${mention}: ${formatStatus(expiration)}`);
      }
      const statusesBullets = toBulletedList(statuses, 1);

      const durations: string[] = [];
      for (const [userId, duration] of this.durationOverrides) {
        const mention = toUserMention(userId);
        durations.push(`${mention}: ${formatHoursMinsSeconds(duration)}`);
      }
      const durationsBullets = toBulletedList(durations, 1);

      const formattedDefault = formatHoursMinsSeconds(this.spec.defaultSeconds);
      result = toBulletedList([
        "**Type:** PER-USER",
        "**Statuses:**" + (statusesBullets
          ? `\n${statusesBullets}`
          : " (none)"
        ),
        `**Default duration:** ${formattedDefault}`,
        "**Duration overrides:**" + (durationsBullets
          ? `\n${durationsBullets}`
          : " (none)"
        ),
      ]);
      return result;
    }

    return null;
  };
}

export function useCooldown(
  manager: CooldownManager,
): ListenerFilter<Events.MessageCreate>;
export function useCooldown(
  spec: CooldownSpec,
): ListenerFilter<Events.MessageCreate>;
export function useCooldown(
  value: CooldownManager | CooldownSpec,
): ListenerFilter<Events.MessageCreate> {
  let manager: CooldownManager;
  if (value instanceof CooldownManager) {
    manager = value;
  } else {
    manager = new CooldownManager();
    manager.set(value);
  }

  return {
    predicate: message => !manager.isActive(message),
    onFail: async (message) => await manager.onCooldown?.(message),
    afterExecute: message => manager.refresh(message),
  };
}
