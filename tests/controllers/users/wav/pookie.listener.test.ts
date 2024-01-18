import onPookieSpec from "../../../../src/controllers/users/wav/pookie.listener";

import { GUILD_EMOJIS } from "../../../../src/utils/emojis.utils";
import { MockMessage } from "../../../test-utils";

let mock: MockMessage;
beforeEach(() => { mock = new MockMessage(onPookieSpec); });

it("should react with neko uwu if content is pookie", async () => {
  mock.mockContent("pookie");
  await mock.simulateEvent();
  mock.expectReactedWith(GUILD_EMOJIS.NEKO_UWU);
});

it("shouldn't do anything if content isn't pookie", async () => {
  mock.mockContent("lorem ipsum");
  await mock.simulateEvent();
  mock.expectNotResponded();
});

it("should trigger even on extended pookie", async () => {
  mock.mockContent("pookieeeeeee");
  await mock.simulateEvent();
  mock.expectReactedWith(GUILD_EMOJIS.NEKO_UWU);
});
