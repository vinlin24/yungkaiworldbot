import { MessageFlags, MessageMentionOptions, userMention } from "discord.js";

import env from "../../../../src/config";
import helloWorldSpec from "../../../../src/controllers/users/s/hello-world.listener";
import { MockMessage } from "../../../test-utils";

it("should ping Taco when S sends hello world", async () => {
  const mock = new MockMessage(helloWorldSpec)
    .mockAuthor({ uid: env.S_UID })
    .mockContent("Hello world");

  await mock.simulateEvent();

  mock.expectRepliedWith({
    content: expect.stringContaining(userMention(env.TACO_UID)),
    allowedMentions: expect.objectContaining<MessageMentionOptions>({
      repliedUser: false,
      users: expect.arrayContaining([env.TACO_UID]),
    }),
    flags: MessageFlags.SuppressNotifications,
  });
});
