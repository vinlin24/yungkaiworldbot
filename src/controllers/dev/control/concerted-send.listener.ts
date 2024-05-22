import { ReplyOptions } from "discord.js";

import { BOT_DEV_RID } from "../../../config";
import getLogger from "../../../logger";
import { messageFromRoles } from "../../../middleware/filters.middleware";
import devControlService from "../../../services/dev-control.service";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { formatContext } from "../../../utils/logging.utils";

const log = getLogger(__filename);

const concertedSend = new MessageListenerBuilder().setId("concerted-send");

concertedSend.filter(() => devControlService.sendWithDev);
concertedSend.filter(messageFromRoles(BOT_DEV_RID));
concertedSend.execute(async message => {
  const context = formatContext(message);
  log.info(`${context}: concerted send with @${message.author.username}.`);

  const { content, reference } = message;

  // If the message was a reply, make the concerted message a reply too.
  const referencedId = reference?.messageId;
  let replyOptions: ReplyOptions | undefined;
  if (referencedId) {
    const referencedMessage =
      await message.channel.messages.cache.get(referencedId);
    if (referencedMessage) {
      replyOptions = {
        messageReference: referencedMessage,
      };
    }
  }

  await message.channel.send({ content, reply: replyOptions });
});

const concertedSendSpec = concertedSend.toSpec();
export default concertedSendSpec;
