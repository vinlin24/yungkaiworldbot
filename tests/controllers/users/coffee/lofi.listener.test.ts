import { Message } from "discord.js";

import env from "../../../../src/config";
import lofiSpec from "../../../../src/controllers/users/coffee/lofi.listener";
import { MockMessage } from "../../../test-utils";

it("should react with LOFI if coffee replies to luke", async () => {
  const mock = new MockMessage(lofiSpec)
    .mockAuthor({ uid: env.COFFEE_UID })
    .mockReference({ author: { id: env.LUKE_UID } } as Message);
  await mock.simulateEvent();
  mock.expectReactedWith("🇱", "🇴", "🇫", "🇮");
});

it("should react with LOFI if luke reacts to coffee", async () => {
  const mock = new MockMessage(lofiSpec)
    .mockAuthor({ uid: env.LUKE_UID })
    .mockReference({ author: { id: env.COFFEE_UID } } as Message);
  await mock.simulateEvent();
  mock.expectReactedWith("🇱", "🇴", "🇫", "🇮");
});

it("should do nothing if the message has no reference", async () => {
  const mock = new MockMessage(lofiSpec).mockAuthor({ uid: env.COFFEE_UID });
  await mock.simulateEvent();
  mock.expectNotResponded();
});
