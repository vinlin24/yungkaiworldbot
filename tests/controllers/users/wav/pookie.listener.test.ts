jest.mock("../../../../src/utils/interaction.utils");

import onPookieSpec from "../../../../src/controllers/users/wav/pookie.listener";

import { GUILD_EMOJIS } from "../../../../src/utils/emojis.utils";
import { reactCustomEmoji } from "../../../../src/utils/interaction.utils";
import { MockMessage } from "../../../test-utils";

const mockedReactCustomEmoji = jest.mocked(reactCustomEmoji);

const mock = new MockMessage(onPookieSpec);

describe("pookie listener", () => {
  it("should react with neko uwu if content is pookie", async () => {
    mock.mockContent("pookie");
    await mock.emitEvent();
    mock.expectReactedWithCustom(mockedReactCustomEmoji, GUILD_EMOJIS.NEKO_UWU);
  });

  it("shouldn't do anything if content isn't pookie", async () => {
    mock.mockContent("lorem ipsum");
    await mock.emitEvent();
    mock.expectNotResponded();
  });
});
