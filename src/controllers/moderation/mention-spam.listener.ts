import {
  EmbedBuilder,
  GuildMember,
  Message,
  MessageFlags,
  userMention,
} from "discord.js";

import getLogger from "../../logger";
import mentionSpamService from "../../services/mention-spam.service";
import { MessageListenerBuilder } from "../../types/listener.types";
import { formatContext } from "../../utils/logging.utils";

const log = getLogger(__filename);

const mentionSpam = new MessageListenerBuilder().setId("mention-spam");

mentionSpam.execute(async message => {
  const { mentions, member } = message;
  const mentionedMembers = mentions.members!.values();
  for (const target of mentionedMembers) {
    const withinRateLimit = mentionSpamService.mentioned(member!.id, target.id);
    if (!withinRateLimit) {
      await timeOutAuthorForMentionSpammingTarget(message, member!, target);
      return true;
    }
  }
  return false;
});

async function timeOutAuthorForMentionSpammingTarget(
  message: Message,
  author: GuildMember,
  target: GuildMember,
): Promise<void> {
  const embed = new EmbedBuilder()
    .setDescription(`Stop spam mentioning ${userMention(target.id)}.`);
  try {
    await message.reply({
      embeds: [embed],
      // Reply with @silent but reply ping ON.
      flags: MessageFlags.SuppressNotifications,
    });
  }
  catch {
    log.warning(`failed to reply to ${message.url}.`);
  }

  const mention = userMention(target.id);
  const reason = `Spam mentioning ${mention} (\`@${target.user.username}\`).`;
  await author.timeout(60_000, reason);

  const context = formatContext(message);
  log.info(
    `${context}: timed out @${author.user.username} for spam mentioning ` +
    `@${target.user.username}.`,
  );
}

const mentionSpamSpec = mentionSpam.toSpec();
export default mentionSpamSpec;
