import { Message } from "discord.js";

import config from "../../../../src/config";
import lofiSpec from "../../../../src/controllers/users/coffee/lofi.listener";
import { MockMessage } from "../../../test-utils";

it("should react with LOFI if conditions are met", async () => {
  const mock = new MockMessage(lofiSpec)
    .mockAuthor({ uid: config.COFFEE_UID })
    .mockReference({ author: { id: config.LUKE_UID } } as Message);
  await mock.simulateEvent();
  mock.expectReactedWith("🇱", "🇴", "🇫", "🇮");
});
