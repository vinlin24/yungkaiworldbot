import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

import getLogger from "../../logger";
import {
  RoleLevel,
  checkPrivilege,
} from "../../middleware/privilege.middleware";
import { IClientWithIntentsAndRunners } from "../../types/client.abc";
import { CommandBuilder } from "../../types/command.types";
import { formatContext } from "../../utils/logging.utils";

const log = getLogger(__filename);

/**
 * Helper class to abstract error handling in each part of the client reload
 * process.
 */
class ClientReloadPipeline {
  private client: IClientWithIntentsAndRunners;
  private context: string;

  constructor(private interaction: ChatInputCommandInteraction) {
    this.client = interaction.client as IClientWithIntentsAndRunners;
    this.context = formatContext(interaction);
  }

  /**
   * Run the reload pipeline, handling errors and replying the the interaction.
   *
   * Postcondition: The interaction will be replied to regardless of success.
   */
  public async run(): Promise<void> {
    const success
      = await this.clearDefinitions()
      && await this.deploySlashCommands()
      && await this.prepareRuntime();
    if (!success) return;

    await this.interaction.reply({ content: "👍", ephemeral: true });
    log.warning(`${this.context}: successfully reloaded client.`);
  }

  private async logAndReplyWithError(error: Error): Promise<void> {
    console.error(error);
    const embed = new EmbedBuilder()
      .setTitle(`Failed to reload client: ${error.name}`)
      .setDescription(error.message);
    await this.interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }

  private async clearDefinitions(): Promise<boolean> {
    try {
      this.client.clearDefinitions();
      return true;
    }
    catch (error) {
      log.crit(`${this.context}: failed to clear definitions.`);
      await this.logAndReplyWithError(error as Error);
      return false;
    }
  }

  private async deploySlashCommands(): Promise<boolean> {
    try {
      await this.client.deploySlashCommands();
      return true;
    }
    catch (error) {
      log.crit(`${this.context}: failed to deploy slash commands.`);
      await this.logAndReplyWithError(error as Error);
      return false;
    }
  }

  private async prepareRuntime(): Promise<boolean> {
    try {
      await this.client.prepareRuntime();
      return true;
    }
    catch (error) {
      log.crit(`${this.context}: failed to reload commands and/or listeners.`);
      await this.logAndReplyWithError(error as Error);
      return false;
    }
  }
}

const reload = new CommandBuilder();

reload.define(new SlashCommandBuilder()
  .setName("reload")
  .setDescription("Reload all commands and event listeners."),
);
reload.check(checkPrivilege(RoleLevel.DEV));
reload.execute(async (interaction) => {
  await new ClientReloadPipeline(interaction).run();
});

const reloadSpec = reload.toSpec();
export default reloadSpec;
