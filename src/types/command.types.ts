import {
  AutocompleteInteraction,
  Awaitable,
  ChatInputCommandInteraction,
  RESTPostAPIApplicationCommandsJSONBody,
} from "discord.js";

export type CommandCheckFunction
  = (interaction: ChatInputCommandInteraction) => Awaitable<boolean>;

export type CommandCheckFailHandler
  = (interaction: ChatInputCommandInteraction) => Awaitable<void>;

export type CommandCheckAfterHandler
  = (interaction: ChatInputCommandInteraction) => Awaitable<void>;

export type CommandExecuteFunction
  = (interaction: ChatInputCommandInteraction) => Awaitable<boolean | void>;

export type CommandAutocompleteHandler
  = (interaction: AutocompleteInteraction) => Awaitable<void>;

export type CommandCheck = {
  predicate: CommandCheckFunction;
  onFail?: CommandCheckFailHandler;
  afterExecute?: CommandCheckAfterHandler;
};

/**
 * For the convenience of controller modules, a command can be specified as a
 * lone predicate or as a complete `CommandCheck` object.
 */
export type CommandCheckType = CommandCheckFunction | CommandCheck;

/**
 * Type guard to determine if a command check was specified as a lone predicate
 * (shorthand).
 */
export function isLoneCheckPredicate(
  value: CommandCheckType,
): value is CommandCheckFunction {
  return typeof value === "function";
}

/**
 * Resolve a `CommandCheckType` union to a full `CommandCheck` object.
 */
export function toCompleteCheck(check: CommandCheckType): CommandCheck {
  if (isLoneCheckPredicate(check)) {
    return { predicate: check };
  }
  return check;
}

export type CommandOptions = {
  /**
   * Whether to insert a broadcast flag in the options for this command.
   * Commands with this option are expected to default to responding
   * ephemerally, with the broadcast option providing the choice to make
   * responses public.
   */
  broadcastOption?: boolean,
  /**
   * Whether to insert an ephemeral flag in the options for this command.
   * Commands with this option are expected to default to responding publicly,
   * with the ephemeral option providing the choice to make responses ephemeral.
   */
  ephemeralOption?: boolean;
};

export type CommandSpec = {
  data: RESTPostAPIApplicationCommandsJSONBody,
  options?: CommandOptions,
  checks?: CommandCheckType[],
  execute: CommandExecuteFunction,
  autocomplete?: CommandAutocompleteHandler,
};
