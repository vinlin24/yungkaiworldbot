import env from "../../../../src/config";
import onSniffsSpec from "../../../../src/controllers/users/cxtie/sniffs.listener";
import {
  GUILD_EMOJIS,
  toEscapedEmoji,
} from "../../../../src/utils/emojis.utils";
import { MockMessage, spyOnRandom } from "../../../test-utils";

describe("sniffs listener", () => {
  afterEach(() => {
    spyOnRandom().mockRestore();
  });

  it("should only listen to Cxtie", async () => {
    const mock = new MockMessage(onSniffsSpec).mockContent("i'm not cxtie");
    await mock.simulateEvent();
    mock.expectNotResponded();
  });

  it("should echo sniffs half the time", async () => {
    const mock = new MockMessage(onSniffsSpec)
      .mockContent("sniffs")
      .mockAuthor({ uid: env.CXTIE_UID });
    spyOnRandom().mockReturnValueOnce(0.99);
    await mock.simulateEvent();
    mock.expectRepliedSilentlyWith({ content: "sniffs" });
  });

  it("should appreciatie cxtie half the time", async () => {
    const mock = new MockMessage(onSniffsSpec)
      .mockContent("sniffs")
      .mockAuthor({ uid: env.CXTIE_UID });
    spyOnRandom().mockReturnValueOnce(0);
    await mock.simulateEvent();
    mock.expectRepliedSilentlyWith({ content: "daily cxtie appreciation" });
  });

  it("should echo the Cxtie sniffs emojis if present", async () => {
    const sniffsEmoji = toEscapedEmoji({
      name: "some-name",
      id: GUILD_EMOJIS.CXTIE_SNIFFS,
    });
    const mock = new MockMessage(onSniffsSpec)
      .mockContent(`You ${sniffsEmoji} make me cry ${sniffsEmoji}!`)
      .mockAuthor({ uid: env.CXTIE_UID });
    spyOnRandom().mockReturnValueOnce(0.99);

    await mock.simulateEvent();

    mock.expectRepliedSilentlyWith(sniffsEmoji.repeat(2));
  });

  it("should do nothing if neither condition is met", async () => {
    const mock = new MockMessage(onSniffsSpec)
      .mockContent("hello there")
      .mockAuthor({ uid: env.CXTIE_UID });
    await mock.simulateEvent();
    mock.expectNotResponded();
  });
});
