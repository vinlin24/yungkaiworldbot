import {
  Awaitable,
  Events,
  Message
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

export type CooldownSpec = {
  type: "global";
  seconds: number;
  bypassers?: Set<string>;
  onCooldown?: OnCooldownFunction;
} | {
  type: "user";
  defaultSeconds: number;
  userSeconds?: Map<string, number>;
  onCooldown?: OnCooldownFunction;
} | {
  type: "disabled";
};

export class CooldownManager {
  private spec: CooldownSpec = { type: "disabled" };

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
        return this.spec.bypassers ?? emptySet;
      case "user":
        if (!this.spec.userSeconds) return emptySet;
        const idsWithDurationZero = Array
          .from(this.spec.userSeconds)
          .filter(([_, duration]) => duration === 0)
          .map(([memberId, _]) => memberId);
        return new Set(idsWithDurationZero);
    }
  }

  public set = (spec: CooldownSpec): void => {
    // Save bypassers. We can transfer them between cooldown types.
    const bypassers = this.getBypassers();

    // Copy to allow support for changing properties of the spec later. NOTE:
    // native support for structuredClone() requires Node 17+.
    this.spec = lodash.cloneDeep(spec);

    // When switching specs, invalidate current expirations.
    this.globalExpiration = new Date(0);
    this.userExpirations.clear();

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
  public setDuration(seconds: number, userId: string): void;
  public setDuration(seconds: number, userId?: string): void {
    if (userId === undefined) {
      this.setGlobalDuration(seconds);
    } else {
      this.setUserDuration(seconds, userId);
    }
  };

  public setBypass = (bypass: boolean, userId: string): void => {
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

    if (!this.spec.userSeconds)
      this.spec.userSeconds = new Map();
    this.spec.userSeconds.set(userId, seconds);
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

    if (!this.spec.bypassers)
      this.spec.bypassers = new Set();

    if (bypass) {
      this.spec.bypassers.add(userId);
      log.debug(
        `added ${toUserMention(userId)} to bypassers for listener ` +
        "with global cooldown type."
      );
    } else {
      this.spec.bypassers.delete(userId);
      log.debug(
        `removed ${toUserMention(userId)} from bypassers for listener ` +
        "with global cooldown type."
      );
    }
  };

  private setUserBypass = (bypass: boolean, userId: string): void => {
    if (this.spec.type !== "user") // Pacify TS.
      throw new Error("unexpected call to setUserCooldownBypass");

    if (!this.spec.userSeconds)
      this.spec.userSeconds = new Map();

    if (bypass) {
      this.setUserDuration(0, userId);
      this.userExpirations.delete(userId); // Invalidate current expiration.
      return;
    }

    const mention = toUserMention(userId);
    const currentCooldown = this.spec.userSeconds?.get(userId);
    // "Revoking bypass" only makes sense if the user already has a duration
    // associated with them and the duration is 0. In this case, just delete
    // them from the mapping overrides to effectively revert them to the
    // default duration.
    if (currentCooldown === 0) {
      this.spec.userSeconds?.delete(userId);
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
        if (this.spec.bypassers?.has(authorId)) return false;
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
        if (this.spec.bypassers?.has(authorId)) return;
        expiration = addDateSeconds(now, this.spec.seconds);
        this.globalExpiration = expiration;
        return;
      case "user":
        const duration =
          this.spec.userSeconds?.get(authorId)
          ?? this.spec.defaultSeconds;
        expiration = addDateSeconds(now, duration);
        this.userExpirations.set(authorId, expiration);
        return;
    }
  };

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
      const bypasserMentions = joinUserMentions(this.spec.bypassers);
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
      for (const [userId, duration] of this.spec.userSeconds ?? []) {
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
