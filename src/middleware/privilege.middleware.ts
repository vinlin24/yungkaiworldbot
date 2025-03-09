import {
  bold,
  CommandInteraction,
  GuildMember,
  inlineCode,
  underscore,
} from "discord.js";

import {
  ALPHA_MOD_RID,
  BABY_MOD_RID,
  DEVELOPER_UIDS,
  KAI_RID,
} from "../config";
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

function highestPrivilegeLevel(member: GuildMember): RoleLevel {
  if (DEVELOPER_UIDS.includes(member.user.id)) {
    return RoleLevel.DEV;
  }
  if (member.roles.cache.has(KAI_RID)) {
    return RoleLevel.KAI;
  }
  if (member.roles.cache.has(ALPHA_MOD_RID)) {
    return RoleLevel.ALPHA_MOD;
  }
  if (member.roles.cache.has(BABY_MOD_RID)) {
    return RoleLevel.BABY_MOD;
  }
  return RoleLevel.NONE;
}

export function isAuthorized(
  member: GuildMember,
  requestLevel: RoleLevel,
): boolean {
  // As long as the level required by the command is less than any of the levels
  // for which the caller has a role, then they pass.
  return requestLevel <= highestPrivilegeLevel(member);
}

export function checkPrivilege(
  commandLevel: RoleLevel,
  member: GuildMember,
): boolean;
export function checkPrivilege(commandLevel: RoleLevel): CommandCheck;
export function checkPrivilege(
  requestLevel: RoleLevel,
  memberToCheck?: GuildMember,
): boolean | CommandCheck {
  if (memberToCheck) {
    return isAuthorized(memberToCheck, requestLevel);
  }

  function predicate(interaction: CommandInteraction): boolean {
    const member = interaction.member as GuildMember;
    return isAuthorized(member, requestLevel);
  }

  async function onFail(interaction: CommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;

    const reason = (
      `minimum required privilege level: ${inlineCode(RoleLevel[requestLevel])}`
    );
    const response = (
      `${bold(member.user.username)}, you're not allowed to use this command!` +
      `\n${underscore("Reason")}: ${reason}.`
    );

    const context = formatContext(interaction);
    log.info(`${context}: ${reason}`);

    await interaction.reply({ content: response, ephemeral: true });
  }

  return { predicate, onFail };
}
