import { Awaitable, CommandInteraction, SlashCommandBuilder } from "discord.js";

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

export type CommandSpec = {
  privilege?: RoleLevel;
  data: Partial<SlashCommandBuilder>;
  execute: (interaction: CommandInteraction) => Awaitable<any>;
};
