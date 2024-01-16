import { MessageFlags } from "discord.js";
import config from "../../../config";
import {
  contentMatching,
  messageFrom,
} from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { toUserMention } from "../../../utils/markdown.utils";

const helloWorld = new MessageListenerBuilder().setId("hello-world");

helloWorld.filter(messageFrom(config.S_UID));
helloWorld.filter(contentMatching(/^(# )?hello world[.~!?-]*$/i));
helloWorld.execute(async (message) => {
  const tacoMention = toUserMention(config.TACO_UID);
  await message.reply({
    content: tacoMention,
    allowedMentions: { repliedUser: false }, // But do allow Taco mention!
    flags: MessageFlags.SuppressNotifications,
  });
});
helloWorld.cooldown({ type: "global", seconds: 180 });

const helloWorldSpec = helloWorld.toSpec();
export default helloWorldSpec;
