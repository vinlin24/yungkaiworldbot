import { MessageFlags, userMention } from "discord.js";

import env from "../../../config";
import {
  contentMatching,
  messageFrom,
} from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";

const helloWorld = new MessageListenerBuilder().setId("hello-world");

helloWorld.filter(messageFrom(env.S_UID));
helloWorld.filter(contentMatching(/^(# )?hello world[.~!?-]*$/i));
helloWorld.execute(async (message) => {
  const tacoMention = userMention(env.TACO_UID);
  await message.reply({
    content: tacoMention,
    allowedMentions: {
      repliedUser: false,
      users: [env.TACO_UID],
    },
    flags: MessageFlags.SuppressNotifications,
  });
});
helloWorld.cooldown({ type: "global", seconds: 180 });

const helloWorldSpec = helloWorld.toSpec();
export default helloWorldSpec;
