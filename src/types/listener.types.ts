import { Awaitable, ClientEvents } from "discord.js";

export type ListenerFilterFunction<Type extends keyof ClientEvents>
  = (...args: ClientEvents[Type]) => Awaitable<boolean>;

export type ListenerFilterFailHandler<Type extends keyof ClientEvents>
  = (...args: ClientEvents[Type]) => Awaitable<void>;

export type ListenerFilterAfterHandler<Type extends keyof ClientEvents>
  = (...args: ClientEvents[Type]) => Awaitable<void>;

export type ListenerExecuteFunction<Type extends keyof ClientEvents>
  = (...args: ClientEvents[Type]) => Awaitable<boolean | void>;

export type ListenerFilter<Type extends keyof ClientEvents> = {
  predicate: ListenerFilterFunction<Type>;
  onFail?: ListenerFilterFailHandler<Type>;
  afterExecute?: ListenerFilterAfterHandler<Type>;
};

/**
 * For the convenience of controller modules, a listener can be specified as a
 * lone predicate or as a complete `ListenerFilter` object.
 */
export type ListenerFilterType<Type extends keyof ClientEvents>
  = ListenerFilterFunction<Type> | ListenerFilter<Type>;

/**
 * Type guard to determine if a listener filter was specified as a lone
 * predicate (shorthand).
 */
export function isLoneFilterPredicate<Type extends keyof ClientEvents>(
  value: ListenerFilterType<Type>,
): value is ListenerFilterFunction<Type> {
  return typeof value === "function";
}

/**
 * Resolve a `ListenerFilterType` union to a full `ListenerFilter` object.
 */
export function toCompleteFilter<Type extends keyof ClientEvents>(
  filter: ListenerFilterType<Type>,
): ListenerFilter<Type> {
  if (isLoneFilterPredicate(filter)) {
    return { predicate: filter };
  }
  return filter;
}

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
   * Sequential filters to determine if the main callback should execute.
   */
  filters?: ListenerFilterType<Type>[];
  /**
   * Main callback.
   */
  execute: ListenerExecuteFunction<Type>;
};

export class DuplicateListenerIDError extends Error {
  constructor(public readonly duplicateId: string) { super(duplicateId); }
}
