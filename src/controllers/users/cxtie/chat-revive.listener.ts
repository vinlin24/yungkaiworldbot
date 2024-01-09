import { Events, Message } from "discord.js";

import config from "../../../config";
import getLogger from "../../../logger";
import {
  CooldownManager,
  useCooldown,
} from "../../../middleware/cooldown.middleware";
import { ListenerSpec, MessageListenerBuilder } from "../../../types/listener.types";
import { replySilently } from "../../../utils/interaction.utils";

const log = getLogger(__filename);

async function replyWithNo(message: Message) {
  await replySilently(message, "no");
};

function containsChatReviveWithPossibleMarkdown(message: Message): boolean {
  const chatReviveWithPossibleMD = /^(?:#+ )?chat revive[.!?~]*$/i;
  return !!message.content.match(chatReviveWithPossibleMD);
}

const cooldown = new CooldownManager({
  type: "user",
  defaultSeconds: 600,
  overrides: new Map([[config.CXTIE_UID, 0]]),
});

const chatReviveSpecSpec: ListenerSpec<Events.MessageCreate>
  = new MessageListenerBuilder()
    .setId("chat-revive")
    .filter(containsChatReviveWithPossibleMarkdown)
    .execute(replyWithNo)
    // TODO: We might as well make saveCooldown (and maybe rename to
    // useCooldown) automatically handle .filter(useCooldown(cooldown)) behind
    // the scenes for us. Having to specify both .filter() and .saveCooldown()
    // is redundant.
    .filter(useCooldown(cooldown))
    .saveCooldown(cooldown)
    .toSpec();

export default chatReviveSpecSpec;
