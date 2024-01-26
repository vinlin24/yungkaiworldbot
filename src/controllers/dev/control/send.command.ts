import {
  ChannelType,
  GuildTextBasedChannel,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import {
  RoleLevel,
  checkPrivilege,
} from "../../../middleware/privilege.middleware";
import { CommandBuilder } from "../../../types/command.types";

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
  .addBooleanOption(input => input
    .setName("enable_mentions")
    .setDescription("Whether mentions should ping the user."),
  ),
);

devSend.check(checkPrivilege(RoleLevel.DEV));
devSend.execute(async interaction => {
  const content = interaction.options.getString("content", true);
  const enableMentions = !!interaction.options.getBoolean("enable_mentions");
  let channel = interaction.options.getChannel("channel") as
    GuildTextBasedChannel | null;
  if (!channel) {
    channel = interaction.channel as GuildTextBasedChannel;
  }

  await channel.send({
    content,
    allowedMentions: enableMentions ? undefined : { parse: [] },
    flags: MessageFlags.SuppressNotifications,
  });

  await interaction.reply({ content: "👍", ephemeral: true });
});

const devSendSpec = devSend.toSpec();
export default devSendSpec;
