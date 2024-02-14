import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  GuildTextBasedChannel,
  Message,
  TextChannel,
} from "discord.js";

// TODO: These types seem to be coupled with the functionality of HandlerProxy.
// Since we make these handler classes to abstract the handling of these
// discord.js objects in the first place, maybe we can deprecate formatContext()
// here later and make it an implementation detail and responsibility of
// HandlerProxy.
export type Contextable =
  | Message
  | ChatInputCommandInteraction
  | AutocompleteInteraction
  | TextChannel
  ;

export function formatContext(message: Message): string;
export function formatContext(interaction: ChatInputCommandInteraction): string;
export function formatContext(interaction: AutocompleteInteraction): string;
export function formatContext(channel: TextChannel): string;

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
export function formatContext(obj: Contextable): string {
  if (obj instanceof Message) {
    const message = obj;
    const authorName = message.author.username;
    const channelName = (message.channel as GuildTextBasedChannel).name;
    return `@${authorName} <MSG> #${channelName}`;
  }
  if (obj instanceof TextChannel) {
    const channel = obj;
    return `#${channel.name}`;
  }
  const interaction = obj;
  const commandName = interaction.commandName;
  const callerName = interaction.user.username;
  const channelName = (interaction.channel as GuildTextBasedChannel).name;
  return `@${callerName} /${commandName} #${channelName}`;
}
