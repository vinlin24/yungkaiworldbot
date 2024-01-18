import { Awaitable, Events, Message } from "discord.js";
import lodash from "lodash";

import getLogger from "../logger";
import { ListenerFilter } from "../types/listener.types";
import { addDateSeconds } from "../utils/dates.utils";

const log = getLogger(__filename);

export type OnCooldownFunction = (message: Message) => Awaitable<void>;

export type GlobalCooldownSpec = {
  type: "global";
  /** Global cooldown duration (seconds). */
  seconds: number;
  /** UIDs that can bypass this cooldown. */
  bypassers?: readonly string[],
  /** Callback to run if cooldown is queried and found to be active. */
  onCooldown?: OnCooldownFunction;
};

export type PerUserCooldownSpec = {
  type: "user";
  /** Default per-user cooldown duration (seconds). */
  defaultSeconds: number;
  /** UID-to-duration mapping for cooldown duration (seconds) overrides. */
  overrides?: ReadonlyMap<string, number>;
  /** Callback to run if cooldown is queried and found to be active. */
  onCooldown?: OnCooldownFunction;
};

export type PerChannelCooldownSpec = {
  type: "channel";
  /** Default per-channel cooldown duration (seconds). */
  defaultSeconds: number;
  /** CID-to-duration mapping for cooldown duration (seconds) overrides. */
  overrides?: ReadonlyMap<string, number>;
  /** Callback to run if cooldown is queried and found to be active. */
  onCooldown?: OnCooldownFunction;
};

export type DisabledCooldownSpec = {
  type: "disabled";
  onCooldown?: undefined; // For consistency sake.
};

export type PerIDCooldownSpec =
  | PerUserCooldownSpec
  | PerChannelCooldownSpec;

export type CooldownSpec =
  | GlobalCooldownSpec
  | PerIDCooldownSpec
  | DisabledCooldownSpec;

export type GlobalCooldownDump
  = Omit<Required<GlobalCooldownSpec>, "onCooldown">
  & { expiration: Date };

export type PerUserCooldownDump
  = Omit<Required<PerUserCooldownSpec>, "onCooldown">
  & { expirations: ReadonlyMap<string, Date> };

export type PerChannelCooldownDump
  = Omit<Required<PerChannelCooldownSpec>, "onCooldown">
  & { expirations: ReadonlyMap<string, Date> };

export type DisabledCooldownDump = { type: "disabled" };

export type PerIDCooldownDump =
  | PerUserCooldownDump
  | PerChannelCooldownDump

export type CooldownDump =
  | GlobalCooldownDump
  | PerIDCooldownDump
  | DisabledCooldownDump;

export interface ICooldownManager<
  SpecType extends CooldownSpec = CooldownSpec,
  DumpType extends CooldownDump = CooldownDump,
> {
  get type(): SpecType["type"];
  get duration(): number;
  get onCooldown(): OnCooldownFunction | null;
  clearCooldowns(): void;
  getBypassers(): string[];
  setDuration(seconds: number, discordId?: string): void;
  setBypass(bypass: boolean, discordId: string): void;
  isActive(message: Message): boolean;
  refresh(message: Message): void;
  dump(): DumpType;
}

export abstract class CooldownManagerABC<
  SpecType extends CooldownSpec = CooldownSpec,
  DumpType extends CooldownDump = CooldownDump,
> implements ICooldownManager<SpecType, DumpType> {

  public readonly spec: SpecType;

  constructor(initialSpec: SpecType) {
    this.spec = lodash.cloneDeep(initialSpec);
  }

  public get type(): SpecType["type"] {
    return this.spec.type;
  }

  public get onCooldown(): OnCooldownFunction | null {
    return this.spec.onCooldown ?? null;
  }

  public abstract get duration(): number;

  public abstract clearCooldowns(): void;
  public abstract getBypassers(): string[];
  public abstract setDuration(seconds: number, discordId?: string): void;
  public abstract setBypass(bypass: boolean, discordId: string): void;
  public abstract isActive(message: Message): boolean;
  public abstract refresh(message: Message): void;
  public abstract dump(): DumpType;
}

export class GlobalCooldownManager
  extends CooldownManagerABC<GlobalCooldownSpec, GlobalCooldownDump> {

  /** Timestamp of cooldown expiration for global type cooldowns. */
  private expiration = new Date(0);
  /** User IDs for users that bypass global cooldown type. */
  private bypassers = new Set<string>();

  constructor(spec: GlobalCooldownSpec) {
    super(spec);
    for (const uid of spec.bypassers ?? []) {
      this.bypassers.add(uid);
    }
  }

  public override get duration(): number {
    return this.spec.seconds;
  }

  public override clearCooldowns(): void {
    this.expiration = new Date(0);
  }

  public override getBypassers(): string[] {
    return Array.from(this.bypassers);
  }

  public override setDuration(seconds: number): void {
    this.spec.seconds = seconds;
  }

  public override setBypass(bypass: boolean, userId: string): void {
    if (bypass) this.bypassers.add(userId);
    else this.bypassers.delete(userId);
  }

  public override isActive(message: Message<boolean>): boolean {
    const now = new Date();
    const authorId = message.author.id;
    // Bypass cooldown, proceed to handling event.
    if (this.bypassers.has(authorId)) {
      return false;
    }
    // Listener on cooldown.
    if (now < this.expiration) {
      return true;
    }
    return false;
  }

  public override refresh(message: Message<boolean>): void {
    const now = new Date();
    const authorId = message.author.id;
    // Bypassers shouldn't interfere with the ongoing cooldown for others.
    if (this.bypassers.has(authorId)) {
      return;
    }
    this.expiration = addDateSeconds(now, this.spec.seconds);
  }

  public override dump(): GlobalCooldownDump {
    return {
      type: "global",
      expiration: this.expiration,
      bypassers: Array.from(this.bypassers),
      seconds: this.spec.seconds,
    };
  }
}

export abstract class PerIDCooldownManager<
  SpecType extends PerIDCooldownSpec,
  DumpType extends PerIDCooldownDump,
> extends CooldownManagerABC<SpecType, DumpType> {

  /** Per-ID cooldown duration overrides. */
  protected overrides = new Map<string, number>();
  /** Per-ID timestamps of cooldown expiration. */
  protected expirations = new Map<string, Date>();

  constructor(spec: SpecType) {
    super(spec);
    if (spec.overrides) {
      for (const [id, duration] of spec.overrides) {
        this.overrides.set(id, duration);
      }
    }
  }

  public override get duration(): number {
    return this.spec.defaultSeconds;
  }

  public override clearCooldowns(): void {
    this.expirations.clear();
  }

  public override getBypassers(): string[] {
    const idsWithDurationZero: string[] = [];
    for (const [id, duration] of this.overrides) {
      if (duration === 0) {
        idsWithDurationZero.push(id);
      }
    }
    return idsWithDurationZero;
  }

  public override setDuration(seconds: number, discordId?: string): void {
    if (discordId === undefined) {
      this.spec.defaultSeconds = seconds;
    }
    else {
      this.overrides.set(discordId, seconds);
    }
  }

  public override setBypass(bypass: boolean, discordId: string): void {
    if (bypass) this.overrides.set(discordId, 0);
    else this.overrides.delete(discordId); // ID falls back to defaultSeconds.
  }

  public override dump(): DumpType {
    // @ts-expect-error "{ ...} is assignable to the constraint of type
    // 'DumpType', but 'DumpType' could be instantiated with a different subtype
    // of constraint 'PerIDCooldownDump'. ts(2322)""
    return {
      type: this.type,
      expirations: this.expirations,
      overrides: this.overrides,
      defaultSeconds: this.spec.defaultSeconds,
    };
  }
}

export class PerUserCooldownManager
  extends PerIDCooldownManager<PerUserCooldownSpec, PerUserCooldownDump> {

  constructor(spec: PerUserCooldownSpec) { super(spec); }

  public override isActive(message: Message): boolean {
    const now = new Date();
    const authorId = message.author.id;
    const expiration = this.expirations.get(authorId);
    if (expiration && now < expiration) {
      return true;
    }
    return false;
  }

  public override refresh(message: Message): void {
    const now = new Date();
    const authorId = message.author.id;
    const duration = this.overrides.get(authorId) ?? this.spec.defaultSeconds;
    const expiration = addDateSeconds(now, duration);
    this.expirations.set(authorId, expiration);
  }
}

export class PerChannelCooldownManager extends
  PerIDCooldownManager<PerChannelCooldownSpec, PerChannelCooldownDump> {

  constructor(spec: PerChannelCooldownSpec) { super(spec); }

  public override isActive(message: Message): boolean {
    const now = new Date();
    const { channelId } = message;
    const expiration = this.expirations.get(channelId);
    if (expiration && now < expiration) {
      return true;
    }
    return false;
  }

  public override refresh(message: Message): void {
    const now = new Date();
    const { channelId } = message;
    const duration = this.overrides.get(channelId) ?? this.spec.defaultSeconds;
    const expiration = addDateSeconds(now, duration);
    this.expirations.set(channelId, expiration);
  }
}

/**
 * Dynamic cooldown manager that can switch between the different cooldown types
 * at runtime.
 */
export class CooldownManager implements ICooldownManager {
  private manager?: CooldownManagerABC;

  private setNewManager(spec: CooldownSpec): void {
    switch (spec.type) {
      case "global":
        this.manager = new GlobalCooldownManager(spec);
        return;
      case "user":
        this.manager = new PerUserCooldownManager(spec);
        return;
      case "channel":
        this.manager = new PerChannelCooldownManager(spec);
        return;
      case "disabled":
        this.manager = undefined;
        return;
    }
  }

  constructor(initialSpec?: CooldownSpec) {
    if (initialSpec) this.set(initialSpec);
  }

  public set(spec: CooldownSpec): void {
    let bypassers: string[] = [];
    // Special policy for switching between GLOBAL and USER: Save bypassers.
    if (this.type === "global" || this.type === "user") {
      bypassers = this.manager?.getBypassers() ?? [];
    }

    this.setNewManager(spec);

    // When switching specs, invalidate current expirations.
    this.manager?.clearCooldowns();

    // Transfer bypassers.
    if (spec.type === "global" || spec.type === "user") {
      for (const memberId of bypassers) {
        this.manager?.setBypass(true, memberId);
      }
    }

    // Add any new bypassers/overrides if provided in spec.
    switch (spec.type) {
      case "global":
        if (!spec.bypassers) break;
        for (const id of spec.bypassers) {
          this.manager?.setBypass(true, id);
        }
        break;
      case "user":
      case "channel":
        if (!spec.overrides) break;
        for (const [id, duration] of spec.overrides) {
          this.manager?.setDuration(duration, id);
        }
        break;
    }
  }

  public update(spec: Partial<CooldownSpec>): void {
    if (!this.manager) {
      const message = "attempted to update a spec that hasn't been set yet";
      log.error(`${message}.`);
      throw new Error(message);
    }

    // Overwrite only the keys that are provided in the new spec.
    const updatedCompleteSpec = {
      ...this.manager.spec,
      ...spec,
    } as CooldownSpec;
    this.set(updatedCompleteSpec);
  }

  // FORWARD THE REST OF THE INTERFACE.

  public get type(): CooldownSpec["type"] {
    return this.manager?.type ?? "disabled";
  }
  public get duration(): number {
    return this.manager?.duration ?? Infinity;
  }
  public get onCooldown(): OnCooldownFunction | null {
    return this.manager?.onCooldown ?? null;
  }
  public isActive(message: Message): boolean {
    return !!this.manager?.isActive(message);
  }
  public refresh(message: Message): void {
    this.manager?.refresh(message);
  }
  public clearCooldowns(): void {
    this.manager?.clearCooldowns();
  }
  public getBypassers(): string[] {
    return this.manager?.getBypassers() ?? [];
  }
  public setDuration(seconds: number, discordId?: string | undefined): void {
    this.manager?.setDuration(seconds, discordId);
  }
  public setBypass(bypass: boolean, discordId: string): void {
    this.manager?.setBypass(bypass, discordId);
  }
  public dump(): CooldownDump {
    return this.manager?.dump() ?? { type: "disabled" };
  }
}

export function useCooldown(
  manager: CooldownManager,
): ListenerFilter<Events.MessageCreate>;
export function useCooldown(
  spec: CooldownSpec,
): ListenerFilter<Events.MessageCreate>;
/**
 * Add a cooldown mechanism to this event listener. This filter passes only if
 * cooldown isn't currently active.
 *
 * NOTE: If adding this middleware to a message creation listener, it might be
 * better to use its custom `.cooldown()` method as that also saves the cooldown
 * manager instance such that it can be dynamically updated at runtime later.
 */
export function useCooldown(
  value: CooldownManager | CooldownSpec,
): ListenerFilter<Events.MessageCreate> {
  let manager: CooldownManager;
  if (value instanceof CooldownManager) {
    manager = value;
  }
  else {
    manager = new CooldownManager();
    manager.set(value);
  }

  return {
    predicate: message => !manager.isActive(message),
    onFail: async (message) => await manager.onCooldown?.(message),
    afterExecute: message => manager.refresh(message),
  };
}
