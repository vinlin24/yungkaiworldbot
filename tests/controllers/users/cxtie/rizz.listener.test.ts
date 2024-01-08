import config from "../../../../src/config";
import onRizzSpec from "../../../../src/controllers/users/cxtie/rizz.listener";
import { SUP_EMOJI_ID } from "../../../../src/services/cxtie.service";
import { GUILD_EMOJIS } from "../../../../src/utils/emojis.utils";
import { MockMessage } from "../../../test-utils";

describe("rizz listener", () => {
  it("should react if content contains cringe emojis", async () => {
    const mock = new MockMessage(onRizzSpec)
      .mockAuthorId(config.CXTIE_UID!)
      .mockContent(`<:sup:${SUP_EMOJI_ID}>`);
    await mock.simulateEvent();
    mock.expectReactedWith(GUILD_EMOJIS.NEKO_GUN);
  });

  it("should react if content is 'tucks hair'", async () => {
    const mock = new MockMessage(onRizzSpec)
      .mockAuthorId(config.CXTIE_UID!)
      .mockContent(`*tucks hair*`);
    await mock.simulateEvent();
    mock.expectReactedWith(GUILD_EMOJIS.NEKO_GUN);
  });
});
