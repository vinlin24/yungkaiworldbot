import {
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  Events,
  SlashCommandBuilder,
} from "discord.js";

import getLogger from "../../logger";
import {
  RoleLevel,
  checkPrivilege,
} from "../../middleware/privilege.middleware";
import { ClientWithIntentsAndRunnersABC } from "../../types/client.abc";
import { CommandBuilder } from "../../types/command.types";
import { formatContext } from "../../utils/logging.utils";
import { getCurrentBranchName } from "../../utils/meta.utils";

const log = getLogger(__filename);

/**
 * Helper class to abstract error handling in each part of the client reload
 * process.
 */
class ClientReloadPipeline {
  private client: ClientWithIntentsAndRunnersABC;
  private context: string;

  constructor(private interaction: ChatInputCommandInteraction) {
    this.client = interaction.client as ClientWithIntentsAndRunnersABC;
    this.context = formatContext(interaction);
  }

  /**
   * Run the reload pipeline, handling errors and replying the the interaction.
   * Parameter `redeploy` specifies whether to also sync slash command
   * definitions with Discord's backend. This is not the default as to prevent
   * being rate-limited.
   *
   * Postcondition: The interaction will be replied to regardless of success.
   */
  public async run(redeploy: boolean, stealth: boolean | null): Promise<void> {
    log.warning(
      `${this.context}: reloading client ` +
      `(redeploy=${redeploy}, stealth=${stealth})...`,
    );

    const branchName = getCurrentBranchName();

    if (stealth !== null) {
      this.client.stealth = stealth;
      // Return the bot to online status.
      if (!stealth) {
        await this.client.user!.setStatus("online");
      }
    }

    let success: boolean;
    if (redeploy) {
      success
        = await this.clearDefinitions()
        && await this.deploySlashCommands()
        && await this.prepareRuntime()
        && await this.reemitReadyEvent();
    }
    else {
      success
        = await this.clearDefinitions()
        && await this.prepareRuntime()
        && await this.reemitReadyEvent();
    }
    if (!success) return;

    this.client.branchName = branchName;
    log.info(`${this.context}: updated client branch name to '${branchName}'.`);

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
      await this.client.clearDefinitions();
      return true;
    }
    catch (error) {
      log.crit(`${this.context}: error in clearing definitions.`);
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
      log.crit(`${this.context}: error in deploying slash commands.`);
      await this.logAndReplyWithError(error as Error);
      return false;
    }
  }

  private async prepareRuntime(): Promise<boolean> {
    try {
      if (await this.client.prepareRuntime()) return true;
    }
    catch (error) {
      log.crit(`${this.context}: error in reloading commands/listeners.`);
      await this.logAndReplyWithError(error as Error);
      return false;
    }
    // No error, but prepareRuntime reported failure.
    log.crit(`${this.context}: failed to reload commands/listeners.`);
    const customError = new Error(
      "No exception was raised when reloading commands and/or listeners, " +
      "but the process reported failure. Check the logs.",
    );
    await this.logAndReplyWithError(customError);
    return false;
  }

  private async reemitReadyEvent(): Promise<boolean> {
    try {
      this.client.emit(Events.ClientReady, this.client as Client<true>);
      return true;
    }
    catch (error) {
      log.crit(`${this.context}: error in re-emitting client ready event.`);
      await this.logAndReplyWithError(error as Error);
      return false;
    }
  }
}

const reload = new CommandBuilder();

reload.define(new SlashCommandBuilder()
  .setName("reload")
  .setDescription("Reload all commands and event listeners.")
  .addBooleanOption(input => input
    .setName("redeploy_slash_commands")
    .setDescription("Whether to redeploy slash commands as well."),
  )
  .addBooleanOption(input => input
    .setName("stealth_mode")
    .setDescription("Stealth mode setting (keeps current setting it omitted)."),
  ),
);
reload.check(checkPrivilege(RoleLevel.DEV));
reload.execute(async (interaction) => {
  const redeploy = !!interaction.options.getBoolean("redeploy_slash_commands");
  const stealth = interaction.options.getBoolean("stealth_mode");
  const handler = new ClientReloadPipeline(interaction);
  await handler.run(redeploy, stealth);
});

const reloadSpec = reload.toSpec();
export default reloadSpec;
