import { Events, Message } from "discord.js";

import config from "../../../config";
import getLogger from "../../../logger";
import {
  ListenerSpec,
  MessageListenerBuilder,
} from "../../../types/listener.types";
import { replySilently } from "../../../utils/interaction.utils";
import { formatContext } from "../../../utils/logging.utils";

const log = getLogger(__filename);

async function replyWithNo(message: Message) {
  await replySilently(message, "no");
  log.debug(`${formatContext(message)}: denied chat revival.`);
}

function containsChatReviveWithPossibleMarkdown(message: Message): boolean {
  const chatReviveWithPossibleMD = /^(?:#+ )?chat revive[.!?~]*$/i;
  return !!message.content.match(chatReviveWithPossibleMD);
}

const chatReviveSpec: ListenerSpec<Events.MessageCreate>
  = new MessageListenerBuilder()
    .setId("chat-revive")
    .filter(containsChatReviveWithPossibleMarkdown)
    .execute(replyWithNo)
    .cooldown({
      type: "user",
      defaultSeconds: 600,
      overrides: new Map([[config.CXTIE_UID, 0]]),
    })
    .toSpec();

export default chatReviveSpec;
