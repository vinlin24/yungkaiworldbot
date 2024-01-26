import { SlashCommandBuilder } from "discord.js";

import {
  RoleLevel,
  checkPrivilege,
} from "../../../middleware/privilege.middleware";
import { CommandBuilder } from "../../../types/command.types";
import {
  fetchMessageByIdentifier,
  fetchMostRecentMessage,
} from "./dev-control-utils";

const devReact = new CommandBuilder();

devReact.define(new SlashCommandBuilder()
  .setName("react")
  .setDescription("Make the bot react to an existing message.")
  .addStringOption(input => input
    .setName("emoji")
    .setDescription("Emoji to react with.")
    .setRequired(true),
  )
  .addStringOption(input => input
    .setName("message")
    .setDescription(
      "Link or ID of message to react to " +
      "(defaults to last message of current channel).",
    ),
  ),
);

devReact.check(checkPrivilege(RoleLevel.DEV));
devReact.execute(async interaction => {
  const emoji = interaction.options.getString("emoji", true);
  const messageIdentifier = interaction.options.getString("message");

  const message = messageIdentifier
    ? await fetchMessageByIdentifier(messageIdentifier, interaction)
    : await fetchMostRecentMessage(interaction);
  if (!message) return false;

  try {
    await message.react(emoji);
  }
  catch (error) {
    await interaction.reply({
      content:
        `Failed to react with \`${emoji}\`. ` +
        "Are you sure this is a valid emoji?",
      ephemeral: true,
    });
    return false;
  }

  await interaction.reply({ content: "👍", ephemeral: true });
  return true;
});

const devReactSpec = devReact.toSpec();
export default devReactSpec;
