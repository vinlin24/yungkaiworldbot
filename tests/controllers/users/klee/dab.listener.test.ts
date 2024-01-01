import onDabSpec from "../../../../src/controllers/users/klee/dab.listener";
import { GUILD_EMOJIS } from "../../../../src/utils/emojis.utils";
import { MockMessage, addMockGetter } from "../../../test-utils";

describe("dab listener", () => {
  let mock: MockMessage;
  beforeEach(() => {
    mock = new MockMessage(onDabSpec);
  })

  it("shouldn't respond if the content isn't dab", async () => {
    mock.mockContent("lorem ipsum").mockAuthorBot(false);
    await mock.emitEvent();
    mock.expectNotResponded();
  });

  it("should respond with dab if the content is dab", async () => {
    mock.mockContent("dab").mockAuthorBot(false);
    await mock.emitEvent();
    mock.expectRepliedSilentlyWith({ content: "dab" });
  });

  it("should react with neko L in pollution-immune channel", async () => {
    addMockGetter(mock.message, "channel", { name: "general" });
    mock.mockContent("dab").mockAuthorBot(false);
    await mock.emitEvent();
    mock.expectReactedWith(GUILD_EMOJIS.NEKO_L);
  });

  it("should react with neko L if on cooldown", async () => {
    mock.mockContent("dab").mockAuthorBot(false).mockCooldownActive();
    await mock.emitEvent();
    mock.expectReactedWith(GUILD_EMOJIS.NEKO_L);
  });
});
