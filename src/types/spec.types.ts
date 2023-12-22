import {
  Awaitable,
  ClientEvents,
  CommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

export enum RoleLevel {
  /**
   * Not gated by any role restrictions.
   * */
  NONE = 0,
  /**
   * Appointed as a lesser moderator in the server. It should be safe to assume
   * that "baby mods" do NOT have the "Administrator" Discord permission.
   */
  BABY_MOD,
  /**
   * Appointed as a greater moderator in the server. It should be safe to
   * assume that "alpha mods" also have the "Administrator" Discord
   * permission.
   * */
  ALPHA_MOD,
  /**
   * Is the server owner.
   */
  KAI,
  /**
   * Is one of the bot developers (aka "bot master").
   */
  DEV,
};

export type CommandCheck =
  (interaction: CommandInteraction) => Awaitable<boolean>;

export type CommandSpec = {
  privilege?: RoleLevel;
  data: Partial<SlashCommandBuilder>;
  execute: (interaction: CommandInteraction) => Awaitable<any>;
  check?: CommandCheck;
};

// NOTE: This type parameter magic is to imitate what's done in
// discord.js/typings/index.ts to make Client.once and Client.on work with our
// custom EventSpec type.
export type EventSpec<EventName extends keyof ClientEvents> = {
  name: EventName;
  once?: boolean;
  execute: (...args: ClientEvents[EventName]) => Awaitable<any>;
};

export type ModuleSpec = {
  name: string;
  commands: CommandSpec[];
  events: EventSpec<any>[];
};
