import {
  CommandInteraction,
  GuildMember,
  GuildTextBasedChannel,
} from "discord.js";

/**
 * Return a formatted string containing the relevant information about a
 * command: the caller's username, the command name, and the name of the channel
 * the command was invoked in. Example usage:
 *
 *    ```
 *    const context = formatContext(interaction);
 *    log.info(`${context}: some message here.`);
 *    ```
 *
 * TODO: Not sure if there's a way to automate this through Winston.
 */
export function formatContext(interaction: CommandInteraction): string {
  const commandName = interaction.commandName;
  const callerName = (interaction.member as GuildMember).user.username;
  const channelName = (interaction.channel as GuildTextBasedChannel).name;
  return `@${callerName} /${commandName} #${channelName}`;
}
