import { MessageFlags, MessageMentionOptions } from "discord.js";

import config from "../../../../src/config";
import helloWorldSpec from "../../../../src/controllers/users/s/hello-world.listener";
import { toUserMention } from "../../../../src/utils/markdown.utils";
import { MockMessage } from "../../../test-utils";

it("should ping Taco when S sends hello world", async () => {
  const mock = new MockMessage(helloWorldSpec)
    .mockAuthor({ uid: config.S_UID })
    .mockContent("Hello world");

  await mock.simulateEvent();

  mock.expectRepliedWith({
    content: expect.stringContaining(toUserMention(config.TACO_UID)),
    allowedMentions: expect.objectContaining<MessageMentionOptions>({
      repliedUser: false,
      users: expect.arrayContaining([config.TACO_UID]),
    }),
    flags: MessageFlags.SuppressNotifications,
  });
});
