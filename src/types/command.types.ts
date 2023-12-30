import {
  AutocompleteInteraction,
  Awaitable,
  ChatInputCommandInteraction,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  SlashCommandBuilder,
} from "discord.js";

export type CommandCheckFunction
  = (interaction: ChatInputCommandInteraction) => Awaitable<boolean>;

export type CommandCheckFailHandler
  = (interaction: ChatInputCommandInteraction) => Awaitable<void>;

export type CommandCheckAfterHandler
  = (interaction: ChatInputCommandInteraction) => Awaitable<void>;

export type CommandAutocompleteHandler
  = (interaction: AutocompleteInteraction) => Awaitable<void>;

export type CommandExecuteFunction
  = (interaction: ChatInputCommandInteraction) => Awaitable<boolean | void>;

/**
 * A prehook for the command callback.
 */
export type CommandCheck = {
  /**
   * Callback computing whether this check should pass.
   */
  predicate: CommandCheckFunction;
  /**
   * Callback to run if the check fails.
   *
   * NOTE: Uncaught exceptions count as check failures but will NOT invoke this
   * callback.
   */
  onFail?: CommandCheckFailHandler;
  /**
   * Callback to run after the main execute callback completes successfully.
   */
  afterExecute?: CommandCheckAfterHandler;
};

/**
 * Fully defines an application command. Every command module is expected to
 * `export default` this type such that the command is properly discovered and
 * registered on bot startup.
 */
export type CommandSpec = {
  /**
   * Slash command definition detailing how it appears to the end user (name,
   * description, options, etc.) on the Discord application.
   */
  definition: RESTPostAPIChatInputApplicationCommandsJSONBody,
  /**
   * Prehooks for the `execute` callback.
   *
   * NOTE: Checks are evaluated in the order they are defined in the command
   * spec and **short-circuit** upon failure or error.
   */
  checks?: CommandCheck[],
  /**
   * Main callback to run when the command is invoked. The body can choose to
   * return a boolean flag to convey success status:
   *
   * - `true`: The command "succeeded".
   * - `false`: The command "failed".
   * - No return value (returning `undefined`/`void`) is treated as "succeeded".
   * - Uncaught exceptions count as "failed".
   */
  execute: CommandExecuteFunction,
  /**
   * Callback to use to resolve command option autocomplete interactions.
   */
  autocomplete?: CommandAutocompleteHandler,
};

/**
 * Adding certain types of options makes the builder incompatible with
 * subcommands apparently. This means functions that take any
 * "`SlashCommandBuilder`" should actually also consider the `Omit` case.
 * */
export type SlashCommandBuilderWithoutSubcommand
  = Omit<SlashCommandBuilder, "addSubcommandGroup" | "addSubcommand">;

/**
 * Adding certain types of options makes the builder incompatible with
 * subcommands apparently. This means functions that take any
 * "`SlashCommandBuilder`" should actually also consider the `Omit` case.
 */
export type AnySlashCommandBuilder =
  | SlashCommandBuilder
  | SlashCommandBuilderWithoutSubcommand;

function isAnySlashCommandBuilder(builder: any)
  : builder is AnySlashCommandBuilder {
  return "addBooleanOption" in builder;
}

/**
 * Utility class for constructing a `CommandSpec` in a more readable way. Usage:
 *
 *    ```
 *    export default new CommandBuilder()
 *      .define(slashCommandDefinition) // required
 *      .check(someCustomCheck)
 *      .check(somePredefinedCheck)
 *      .execute(mainActionOfCommand) // required
 *      .autocomplete(autocompleteUserOption)
 *      .toSpec();
 *    ```
 */
export class CommandBuilder {
  private definition?: RESTPostAPIChatInputApplicationCommandsJSONBody;
  private checks: CommandCheck[] = [];
  private executeCallback?: CommandExecuteFunction;
  private autocompleteCallback?: CommandAutocompleteHandler;

  public define(definition: SlashCommandBuilder): this;
  public define(definition: SlashCommandBuilderWithoutSubcommand): this;
  public define(definition:
    | RESTPostAPIChatInputApplicationCommandsJSONBody,
  ): this;
  public define(definition:
    | SlashCommandBuilder
    | SlashCommandBuilderWithoutSubcommand
    | RESTPostAPIChatInputApplicationCommandsJSONBody,
  ): this {
    if (isAnySlashCommandBuilder(definition)) {
      this.definition = definition.toJSON();
    } else {
      this.definition = definition;
    }
    return this;
  }

  public check(check: CommandCheck): this;
  public check(callback: CommandCheckFunction): this;
  public check(check: CommandCheck | CommandCheckFunction): this {
    // For the convenience of controller modules, a command can be specified as
    // a lone predicate or as a complete CommandCheck object.
    if (typeof check === "function") {
      this.checks.push({ predicate: check });
    } else {
      this.checks.push(check);
    }
    return this;
  }

  public execute(callback: CommandExecuteFunction): this {
    this.executeCallback = callback;
    return this;
  }

  public autocomplete(callback: CommandAutocompleteHandler): this {
    this.autocompleteCallback = callback;
    return this;
  }

  public toSpec(): CommandSpec {
    if (!this.definition) {
      throw new Error("missing slash command definition.");
    }
    if (!this.executeCallback) {
      throw new Error("missing command execute callback");
    }
    return {
      definition: this.definition,
      checks: this.checks,
      execute: this.executeCallback,
      autocomplete: this.autocompleteCallback,
    };
  }
}
