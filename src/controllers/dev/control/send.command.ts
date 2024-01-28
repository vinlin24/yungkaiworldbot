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
import { resolveMessageToRespondTo } from "./dev-control-utils";

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
      "ID or URL of message to reply to. ^ for last message. " +
      "Overrides channel option if applicable.",
    ),
  )
  .addBooleanOption(input => input
    .setName("silent")
    .setDescription("Whether to suppress notifications and mentions."),
  ),
);

devSend.check(checkPrivilege(RoleLevel.DEV));
devSend.execute(async interaction => {
  const content = interaction.options.getString("content", true);
  const silent = !!interaction.options.getBoolean("silent");
  const referenceId = interaction.options.getString("reference");

  const reference = await resolveMessageToRespondTo(interaction, referenceId);
  // resolveMessageToRespondTo already replies about error.
  if (reference === "invalid message") return false;
  const channel = resolveChannelToSendTo(interaction, reference);

  await channel.send({
    content,
    allowedMentions: silent ? { parse: [] } : undefined,
    flags: silent ? MessageFlags.SuppressNotifications : undefined,
    reply: reference ? { messageReference: reference } : undefined,
  });

  await interaction.reply({ content: "👍", ephemeral: true });
  return true;
});

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
