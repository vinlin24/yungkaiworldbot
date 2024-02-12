import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import getLogger from "../../logger";
import {
  checkPrivilege,
  RoleLevel,
} from "../../middleware/privilege.middleware";
import { CommandBuilder, CommandSpec } from "../../types/command.types";
import { formatContext } from "../../utils/logging.utils";

const log = getLogger(__filename);

const slashCommandDefinition = new SlashCommandBuilder()
  .setName("shutdown")
  .setDescription("Terminates the bot.");

async function shutdownBot(
  interaction: ChatInputCommandInteraction,
): Promise<never> {
  const context = formatContext(interaction);
  try {
    await interaction.reply({ content: "🫡", ephemeral: true });
  }
  // Command should still try to shut down bot no matter what.
  catch (error) {
    log.error(`${context}: failed to acknowledge the command.`);
    console.error(error);
  }

  await interaction.client.destroy();
  log.info(`${context}: terminated bot runtime.`);
  // TODO: Is this safe? What if we have teardown code? Should we just use
  // process.on("exit", ...)?
  process.exit(0);
}

const shutdownSpec: CommandSpec = new CommandBuilder()
  .define(slashCommandDefinition)
  .check(checkPrivilege(RoleLevel.BABY_MOD))
  .execute(shutdownBot)
  .toSpec();

export default shutdownSpec;
