import {
  ChannelType,
  ChatInputCommandInteraction,
  GuildTextBasedChannel,
  Message,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import {
  RoleLevel,
  checkPrivilege,
} from "../../../middleware/privilege.middleware";
import { CommandBuilder } from "../../../types/command.types";
import {
  fetchMessageByIdentifier,
  fetchMostRecentMessage,
} from "./dev-control-utils";

const devSend = new CommandBuilder();

devSend.define(new SlashCommandBuilder()
  .setName("send")
  .setDescription("Make the bot send something somewhere.")
  .addStringOption(input => input
    .setName("content")
    .setDescription("Text to send.")
    .setRequired(true),
  )
  .addChannelOption(input => input
    .setName("channel")
    .setDescription("Channel to send to (defaults to current channel).")
    .addChannelTypes(ChannelType.GuildText),
  )
  .addStringOption(input => input
    .setName("reference")
    .setDescription(
      "ID or URL of message to reply to. \"^\" for last message. " +
      "Overrides channel option if applicable.",
    ),
  )
  .addBooleanOption(input => input
    .setName("enable_mentions")
    .setDescription("Whether mentions should ping the user."),
  ),
);

devSend.check(checkPrivilege(RoleLevel.DEV));
devSend.execute(async interaction => {
  const content = interaction.options.getString("content", true);
  const enableMentions = !!interaction.options.getBoolean("enable_mentions");

  const reference = await resolveMessageToReplyTo(interaction);
  // resolveMessageToReplyTo already replies about error.
  if (reference === "invalid message") return false;
  const channel = resolveChannelToSendTo(interaction, reference);

  await channel.send({
    content,
    allowedMentions: enableMentions ? undefined : { parse: [] },
    flags: MessageFlags.SuppressNotifications,
    reply: reference ? { messageReference: reference } : undefined,
  });

  await interaction.reply({ content: "👍", ephemeral: true });
  return true;
});

/**
 * - Return a `Message` object representing the message to reply to if a
 *   reference is provided and is valid.
 * - Return `null` if no reference is provided, so the bot's message shouldn't
 *   reply to anything.
 * - Return `"invalid message"` if a reference is provided but is invalid, so
 *   the bot should reject the command and show an error to the caller.
 */
async function resolveMessageToReplyTo(
  interaction: ChatInputCommandInteraction,
): Promise<Message | null | "invalid message"> {
  const referenceIdentifier = interaction.options.getString("reference");
  if (referenceIdentifier === "^") {
    return await fetchMostRecentMessage(interaction);
  }
  if (referenceIdentifier) {
    const message = await fetchMessageByIdentifier(
      referenceIdentifier,
      interaction,
    );
    if (message === null) return "invalid message";
    return message;
  }
  return null;
}

/**
 * Return the text channel the bot should ultimately send the message to.
 *
 * - If a valid reference was provided, use the channel of the referenced
 *   message.
 * - Else use the channel provided in the `channel` option.
 * - Else use the channel the command was invoked in.
 */
function resolveChannelToSendTo(
  interaction: ChatInputCommandInteraction,
  reference: Message | null,
): GuildTextBasedChannel {
  let channel = interaction.options.getChannel("channel") as
    GuildTextBasedChannel | null;
  if (!channel) {
    channel = interaction.channel as GuildTextBasedChannel;
  }
  // Override channel if message to reply to is in a different channel.
  if (reference && reference.channelId !== channel.id) {
    channel = reference.channel as GuildTextBasedChannel;
  }
  return channel;
}

const devSendSpec = devSend.toSpec();
export default devSendSpec;
