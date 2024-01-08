import { Awaitable, ClientEvents, Events } from "discord.js";

import { z } from "zod";
import { CooldownManager } from "../middleware/cooldown.middleware";

export type ListenerFilterFunction<Type extends keyof ClientEvents>
  = (...args: ClientEvents[Type]) => Awaitable<boolean>;

export type ListenerFilterFailHandler<Type extends keyof ClientEvents>
  = (...args: ClientEvents[Type]) => Awaitable<any>;

export type ListenerFilterAfterHandler<Type extends keyof ClientEvents>
  = (...args: ClientEvents[Type]) => Awaitable<any>;

export type ListenerExecuteFunction<Type extends keyof ClientEvents>
  = (...args: ClientEvents[Type]) => Awaitable<boolean | void>;

/**
 * A prehook for the listener callback.
 */
export type ListenerFilter<Type extends keyof ClientEvents> = {
  /**
   * Callback computing whether this filter should pass.
   */
  predicate: ListenerFilterFunction<Type>;
  /**
   * Callback to run if the filter fails.
   *
   * NOTE: Uncaught exceptions count as filter failures but will NOT invoke this
   * callback.
   */
  onFail?: ListenerFilterFailHandler<Type>;
  /**
   * Callback to run after the main execute callback completes successfully.
   */
  afterExecute?: ListenerFilterAfterHandler<Type>;
};

/**
 * Fully defines an event listener. Every listener module is expected to `export
 * default` this type such that the listener is properly discovered and
 * registered on bot startup.
 */
export type ListenerSpec<Type extends keyof ClientEvents> = {
  /** Type of events to listen to. */
  type: Type;
  /**
   * Unique name to identify this listener instance. This name will be used to
   * retrieve listeners and what is displayed for debugging purposes.
   */
  id: string;
  /**
   * Whether this listener should only listen once. Defaults to false
   * (continuously listen to events).
   */
  once?: boolean;
  /**
   * Filters to determine if the main callback should execute.
   *
   * NOTE: Filters are evaluated in the order they are defined in the listener
   * spec and **short-circuit** upon failure or error.
   */
  filters?: ListenerFilter<Type>[];
  /**
   * Main callback to run when the event is emitted. The body can choose to
   * return a boolean flag to convey success status:
   *
   * - `true`: The handler "succeeded".
   * - `false`: The handler "failed".
   * - No return value (returning `undefined`/`void`) is treated as "succeeded".
   * - Uncaught exceptions count as "failed".
   */
  execute: ListenerExecuteFunction<Type>;
  /**
   * Dynamic cooldown manager for message creation listeners. If you want to be
   * able to change this listener's cooldown spec at runtime (such as through
   * commands), then you should include this property.
   */
  cooldown?: Type extends Events.MessageCreate ? CooldownManager : never;
};

/**
 * Schema for the `ListenerSpec` type for Zod runtime parsing/validation.
 *
 * NOTE: This schema merely checks for the existence of and basic types of the
 * expected keys, not the internal structure of all the values such as function
 * argument/return types or JSON schema/class types that come from within
 * discord.js. This schema is mostly meant to sanity check that the coders
 * default exported the the correct type from a controller file.
 */
export const listenerSpecSchema = z.object({
  type: z.string(),
  id: z.string(),
  once: z.boolean().optional(),
  filters: z.array(z.object({
    predicate: z.function(),
    onFail: z.function().optional(),
    afterExecute: z.function().optional(),
  })).optional(),
  execute: z.function(),
  cooldown: z.instanceof(CooldownManager).optional(),
});

/**
 * Utility class for constructing a `ListenerSpec` in a more readable way.
 * Usage:
 *
 *    ```
 *    export default new ListenerBuilder(Events.ClientReady)
 *      .setId("unique-name-for-listener") // required
 *      .filter(someCustomFilter)
 *      .filter(somePredefinedFilter)
 *      .execute(mainActionOfListener) // required
 *      .toSpec();
 *    ```
 */
export class ListenerBuilder<Type extends keyof ClientEvents> {
  private id?: string;
  private once: boolean = false;
  private filters: ListenerFilter<Type>[] = [];
  private executeCallback?: ListenerExecuteFunction<Type>;
  constructor(private type: Type) { }

  public setId(id: string): this {
    this.id = id;
    return this;
  }

  public setOnce(): this {
    this.once = true;
    return this;
  }

  public filter(filter: ListenerFilter<Type>): this;
  public filter(callback: ListenerFilterFunction<Type>): this;
  public filter(filter:
    | ListenerFilter<Type>
    | ListenerFilterFunction<Type>,
  ): this {
    // For the convenience of controller modules, a listener can be specified as
    // a lone predicate or as a complete `ListenerFilter` object.
    if (typeof filter === "function") {
      this.filters.push({ predicate: filter });
    } else {
      this.filters.push(filter);
    }
    return this;
  }

  public execute(callback: ListenerExecuteFunction<Type>): this {
    this.executeCallback = callback;
    return this;
  }

  public toSpec(): ListenerSpec<Type> {
    if (this.id === undefined) {
      throw new Error("missing ID to uniquely identify the listener");
    }
    if (!this.executeCallback) {
      throw new Error("missing listener execute callback");
    }
    return {
      type: this.type,
      id: this.id,
      once: this.once,
      execute: this.executeCallback,
      filters: this.filters,
    };
  }
}

/**
 * Utility class for constructing a `ListenerSpec` in a more readable way,
 * specialized for message creation events. Such listeners support a cooldown
 * mechanism that can be defined with this builder.
 */
export class MessageListenerBuilder
  extends ListenerBuilder<Events.MessageCreate> {

  private cooldown?: CooldownManager;

  constructor() { super(Events.MessageCreate); }

  /**
   * Save the dynamic cooldown manager for message creation listeners. If you
   * want to be able to change this listener's cooldown spec at runtime (such as
   * through commands), then you should include this call in addition to the
   * middleware passed to the filters.
   */
  public saveCooldown(manager: CooldownManager): this {
    this.cooldown = manager;
    return this;
  }

  public override toSpec(): ListenerSpec<Events.MessageCreate> {
    return {
      ...super.toSpec(),
      cooldown: this.cooldown,
    };
  }
}

export class DuplicateListenerIDError extends Error {
  constructor(public readonly duplicateId: string) { super(duplicateId); }
}
