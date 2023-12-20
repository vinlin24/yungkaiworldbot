import { CommandInteraction, Events, GuildMember } from "discord.js";

import { BotClient } from "../client";
import config from "../config";
import log from "../logger";
import { CommandSpec, RoleLevel } from "../types/command.types";
import { EventSpec } from "../types/event.types";
import { formatContext } from "../utils/logging.utils";
import { toRoleMention } from "../utils/markdown.utils";

const LEVEL_TO_RID = new Map([
  [RoleLevel.DEV, config.BOT_DEV_RID],
  [RoleLevel.KAI, config.KAI_RID],
  [RoleLevel.ALPHA_MOD, config.ALPHA_MOD_RID],
  [RoleLevel.BABY_MOD, config.BABY_MOD_RID],
]);

function checkRoleLevel(
  member: GuildMember,
  commandLevel?: RoleLevel,
): string | null {
  if (commandLevel === undefined || commandLevel === RoleLevel.NONE)
    return null;

  for (const [level, roleId] of LEVEL_TO_RID.entries()) {
    // As long as the level required by the command is less than any of the
    // levels for which the caller has a role, then they pass.
    if (commandLevel <= level && member.roles.cache.has(roleId))
      return null;
  }

  const minimumRoleId = LEVEL_TO_RID.get(commandLevel)!;
  const roleMention = toRoleMention(minimumRoleId);
  return (
    "minimum required privilege level: " +
    `\`${RoleLevel[commandLevel]}\` (${roleMention})`
  );
}

async function checkPrivilege(
  command: CommandSpec,
  interaction: CommandInteraction,
): Promise<boolean> {
  const member = interaction.member as GuildMember;
  const privilegeErrorMessage = checkRoleLevel(member, command.privilege);

  if (privilegeErrorMessage === null)
    return true;

  const context = formatContext(interaction);
  log.info(`${context}: ${privilegeErrorMessage}`);

  const response = (
    `**${member.user.username}**, you're not allowed to use this command!` +
    `\n__Reason__: ${privilegeErrorMessage}.`
  );
  await interaction.reply({ content: response, ephemeral: true });

  return false;
}

async function handleCommandError(
  error: Error,
  interaction: CommandInteraction,
): Promise<void> {
  // TODO: Provide more useful responses.
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({
      content: "There was an error while executing this command!",
      ephemeral: true,
    });
  } else {
    await interaction.reply({
      content: "There was an error while executing this command!",
      ephemeral: true,
    });
  }
}

const spec: EventSpec<Events.InteractionCreate> = {
  name: Events.InteractionCreate,

  async execute(interaction) {
    if (!interaction.isChatInputCommand())
      return;

    const client = interaction.client as BotClient;
    const commandName = interaction.commandName;
    const command = client.commands.get(commandName);

    const context = formatContext(interaction);

    if (!command) {
      log.error(`${context}: no command found.`);
      return;
    }
    log.debug(`${context}: processing command.`);

    const authorized = await checkPrivilege(command, interaction);
    if (!authorized)
      return;

    try {
      await command.execute(interaction);
      log.debug(`${context}: command executed successfully.`);
    } catch (error) {
      log.error(`${context}: ${error}`);
      console.error(error); // For the traceback.
      await handleCommandError(error as Error, interaction);
    }
  }
};

export default spec;
