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
  const channel = resolveChannelToSendTo(interaction, reference);

  await channel.send({
    content,
    allowedMentions: enableMentions ? undefined : { parse: [] },
    flags: MessageFlags.SuppressNotifications,
    reply: reference ? { messageReference: reference } : undefined,
  });

  await interaction.reply({ content: "👍", ephemeral: true });
});

async function resolveMessageToReplyTo(
  interaction: ChatInputCommandInteraction,
): Promise<Message | null> {
  const referenceIdentifier = interaction.options.getString("reference");
  if (referenceIdentifier === "^") {
    return await fetchMostRecentMessage(interaction);
  }
  if (referenceIdentifier) {
    return await fetchMessageByIdentifier(
      referenceIdentifier,
      interaction,
    );
  }
  return null;
}

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
