import { CommandInteraction, GuildMember, roleMention } from "discord.js";

import { ALPHA_MOD_RID, BABY_MOD_RID, BOT_DEV_RID, KAI_RID } from "../config";
import getLogger from "../logger";
import { CommandCheck } from "../types/command.types";
import { formatContext } from "../utils/logging.utils";

const log = getLogger(__filename);

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
}

export const LEVEL_TO_RID: Record<
  Exclude<RoleLevel, RoleLevel.NONE>,
  string
> = {
  [RoleLevel.DEV]: BOT_DEV_RID,
  [RoleLevel.KAI]: KAI_RID,
  [RoleLevel.ALPHA_MOD]: ALPHA_MOD_RID,
  [RoleLevel.BABY_MOD]: BABY_MOD_RID,
};

export function checkPrivilege(
  commandLevel: RoleLevel,
  member: GuildMember,
): boolean;
export function checkPrivilege(commandLevel: RoleLevel): CommandCheck;
export function checkPrivilege(
  commandLevel: RoleLevel,
  memberToCheck?: GuildMember,
): boolean | CommandCheck {
  function isAuthorized(member: GuildMember): boolean {
    for (const level of Object.keys(LEVEL_TO_RID)) {
      const levelValue = Number(level) as Exclude<RoleLevel, RoleLevel.NONE>;
      const roleId = LEVEL_TO_RID[levelValue];
      // As long as the level required by the command is less than any of the
      // levels for which the caller has a role, then they pass.
      if (commandLevel <= levelValue && member.roles.cache.has(roleId)) {
        return true;
      }
    }
    return false;
  }

  if (memberToCheck) {
    return isAuthorized(memberToCheck);
  }

  function predicate(interaction: CommandInteraction): boolean {
    const member = interaction.member as GuildMember;
    return isAuthorized(member);
  }

  async function onFail(interaction: CommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;

    if (commandLevel === RoleLevel.NONE) { // Pacify LEVEL_TO_RID lookup.
      throw new Error("commandLevel was NONE, check shouldn't have failed.");
    }
    const minimumRoleId = LEVEL_TO_RID[commandLevel];
    const mention = roleMention(minimumRoleId);
    const reason = (
      "minimum required privilege level: " +
      `\`${RoleLevel[commandLevel]}\` (${mention})`
    );
    const response = (
      `**${member.user.username}**, you're not allowed to use this command!` +
      `\n__Reason__: ${reason}.`
    );

    const context = formatContext(interaction);
    log.info(`${context}: ${reason}`);

    await interaction.reply({ content: response, ephemeral: true });
  }

  return { predicate, onFail };
}
