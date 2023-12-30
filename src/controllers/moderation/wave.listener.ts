import { Events, GuildTextBasedChannel, Message } from "discord.js";

import getLogger from "../../logger";
import {
  ListenerSpec,
  MessageListenerBuilder,
} from "../../types/listener.types";
import { formatContext } from "../../utils/logging.utils";

const log = getLogger(__filename);

async function waveAtIntroduction(message: Message): Promise<boolean> {
  await message.react("👋");
  const context = formatContext(message);
  log.info(`${context}: waved at user's introduction.`);
  return true;
}

function isAnIntroduction(message: Message): boolean {
  const channel = message.channel as GuildTextBasedChannel;
  const inIntroductionChannel = channel.name.includes("introductions");
  const isAReply = !!message.reference;
  // Assume that anything that's not a reply is an introduction.
  return inIntroductionChannel && !isAReply;
}

const waveSpec: ListenerSpec<Events.MessageCreate>
  = new MessageListenerBuilder()
    .setId("wave-introduction")
    .filter(isAnIntroduction)
    .execute(waveAtIntroduction)
    .toSpec();

export default waveSpec;
