import { CommandInteraction, GuildMember } from "discord.js";
import config from "../config";
import log from "../logger";
import { CommandCheck } from "../types/module.types";
import { formatContext } from "../utils/logging.utils";
import { toRoleMention } from "../utils/markdown.utils";

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

const LEVEL_TO_RID = new Map([
  [RoleLevel.DEV, config.BOT_DEV_RID],
  [RoleLevel.KAI, config.KAI_RID],
  [RoleLevel.ALPHA_MOD, config.ALPHA_MOD_RID],
  [RoleLevel.BABY_MOD, config.BABY_MOD_RID],
]);

export function checkPrivilege(commandLevel: RoleLevel): CommandCheck {
  function check(interaction: CommandInteraction): boolean {
    const member = interaction.member as GuildMember;
    for (const [level, roleId] of LEVEL_TO_RID.entries()) {
      // As long as the level required by the command is less than any of the
      // levels for which the caller has a role, then they pass.
      if (commandLevel <= level && member.roles.cache.has(roleId))
        return true;
    }
    return false;
  }

  async function onFail(interaction: CommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;

    const minimumRoleId = LEVEL_TO_RID.get(commandLevel)!;
    const roleMention = toRoleMention(minimumRoleId);
    const reason = (
      "minimum required privilege level: " +
      `\`${RoleLevel[commandLevel]}\` (${roleMention})`
    );
    const response = (
      `**${member.user.username}**, you're not allowed to use this command!` +
      `\n__Reason__: ${reason}.`
    );

    const context = formatContext(interaction);
    log.info(`${context}: ${reason}`);

    await interaction.reply({ content: response, ephemeral: true });
  }

  return { check, onFail };
}
