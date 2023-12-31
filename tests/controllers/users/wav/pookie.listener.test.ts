import onPookieSpec from "../../../../src/controllers/users/wav/pookie.listener";

import { GUILD_EMOJIS } from "../../../../src/utils/emojis.utils";
import { MockMessage } from "../../../test-utils";

const mock = new MockMessage(onPookieSpec);

describe("pookie listener", () => {
  it("should react with neko uwu if content is pookie", async () => {
    mock.mockContent("pookie");
    await mock.emitEvent();
    mock.expectReactedWith(GUILD_EMOJIS.NEKO_UWU);
  });

  it("shouldn't do anything if content isn't pookie", async () => {
    mock.mockContent("lorem ipsum");
    await mock.emitEvent();
    mock.expectNotResponded();
  });
});
