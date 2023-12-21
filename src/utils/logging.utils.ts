import {
  CommandInteraction,
  GuildTextBasedChannel,
  Message,
} from "discord.js";

export function formatContext(message: Message): string;
export function formatContext(interaction: CommandInteraction): string;

/**
 * Return a formatted string containing the relevant information about a
 * message or application command invocation. Example usage:
 *
 *    ```
 *    const context = formatContext(interaction);
 *    log.info(`${context}: some message here.`);
 *    ```
 *
 * TODO: Not sure if there's a way to automate this through Winston.
 */
export function formatContext(obj: Message | CommandInteraction): string {
  if (obj instanceof CommandInteraction) {
    const interaction = obj;
    const commandName = interaction.commandName;
    const callerName = interaction.user.username;
    const channelName = (interaction.channel as GuildTextBasedChannel).name;
    return `@${callerName} /${commandName} #${channelName}`;
  }
  const message = obj;
  const authorName = message.author.username;
  const channelName = (message.channel as GuildTextBasedChannel).name;
  return `@${authorName} <MSG> #${channelName}`;
}
