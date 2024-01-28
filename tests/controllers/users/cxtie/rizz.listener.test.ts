import env from "../../../../src/config";
import onRizzSpec from "../../../../src/controllers/users/cxtie/rizz.listener";
import { SUP_EMOJI_ID } from "../../../../src/services/cxtie.service";
import {
  CustomEmoji,
  GUILD_EMOJIS,
  toEscapedEmoji,
} from "../../../../src/utils/emojis.utils";
import { MockMessage } from "../../../test-utils";

describe("rizz listener", () => {
  it("should react if content contains cringe emojis", async () => {
    const sup: CustomEmoji = { id: SUP_EMOJI_ID, name: "sup" };
    const mock = new MockMessage(onRizzSpec)
      .mockAuthor({ uid: env.CXTIE_UID })
      .mockContent(toEscapedEmoji(sup));
    await mock.simulateEvent();
    mock.expectReactedWith(GUILD_EMOJIS.NEKO_GUN);
  });

  it("should react if content is 'tucks hair'", async () => {
    const mock = new MockMessage(onRizzSpec)
      .mockAuthor({ uid: env.CXTIE_UID })
      .mockContent("*tucks hair*");
    await mock.simulateEvent();
    mock.expectReactedWith(GUILD_EMOJIS.NEKO_GUN);
  });
});
