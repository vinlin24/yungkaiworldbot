import {
  ChatInputCommandInteraction,
  EmojiIdentifierResolvable,
  Message,
  SlashCommandBuilder,
  inlineCode,
} from "discord.js";

import getLogger from "../../../logger";
import {
  RoleLevel,
  checkPrivilege,
} from "../../../middleware/privilege.middleware";
import { CommandBuilder } from "../../../types/command.types";
import { extractAllEmojis } from "../../../utils/emojis.utils";
import { formatContext } from "../../../utils/logging.utils";
import {
  fetchNthMostRecentMessage,
  resolveMessageToRespondTo,
} from "./dev-control-utils";

const log = getLogger(__filename);

const devReact = new CommandBuilder();

devReact.define(new SlashCommandBuilder()
  .setName("react")
  .setDescription("Make the bot react to an existing message.")
  .addStringOption(input => input
    .setName("emojis")
    .setDescription("Emoji(s) to react with.")
    .setRequired(true),
  )
  .addStringOption(input => input
    .setName("message")
    .setDescription(
      "ID, URL, or ^ notation of message to react to. " +
      "(defaults to last message of current channel).",
    ),
  ),
);

devReact.check(checkPrivilege(RoleLevel.DEV));
devReact.execute(async interaction => {
  const inputString = interaction.options.getString("emojis", true);
  const messageId = interaction.options.getString("message");

  const emojis = extractAllEmojis(inputString);
  if (emojis.length === 0) {
    await interaction.reply({
      content: `No emojis found in your input ${inlineCode(inputString)}!`,
      ephemeral: true,
    });
    return false;
  }

  let message = await resolveMessageToRespondTo(interaction, messageId);
  // resolveMessageToRespondTo already replies about error.
  if (message === "invalid message") return false;
  if (message === null) {
    message = await fetchNthMostRecentMessage(interaction, 1);
  }
  if (message === null) return false;

  const success = await reactWithEmojisAndReplyToInteraction(
    message,
    emojis,
    interaction,
  );
  return success;
});

async function reactWithEmojisAndReplyToInteraction(
  message: Message,
  emojis: EmojiIdentifierResolvable[],
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  const context = formatContext(interaction);

  const succeededEmojis: EmojiIdentifierResolvable[] = [];
  const failedEmojis: EmojiIdentifierResolvable[] = [];

  for (const emoji of emojis) {
    try {
      await message.react(emoji);
      succeededEmojis.push(emoji);
    }
    catch (error) {
      failedEmojis.push(emoji);
    }
  }

  if (succeededEmojis.length > 0) {
    log.info(
      `${context}: reacted with ${succeededEmojis.join(", ")} ` +
      `on ${message.url}.`,
    );
  }

  if (failedEmojis.length > 0) {
    log.warning(
      `${context}: failed to react with ${failedEmojis.join(", ")} ` +
      `on ${message.url}.`,
    );

    const formattedFailedEmojis = failedEmojis
      .map(emoji => inlineCode(emoji as string))
      .join(", ");

    await interaction.reply({
      content:
        `Failed to react with emojis: ${formattedFailedEmojis}. ` +
        "Are you sure these are valid emojis?",
      ephemeral: true,
    });

    return false;
  }

  await interaction.reply({
    content: `✅ Reacted with ${succeededEmojis.join(" ")}`,
    ephemeral: true,
  });
  return true;
}

const devReactSpec = devReact.toSpec();
export default devReactSpec;
