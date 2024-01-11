import profanitySpec from "../../../src/controllers/moderation/profanity.listener";
import { GUILD_EMOJIS } from "../../../src/utils/emojis.utils";
import { MockMessage } from "../../test-utils";

it("should react with neko gun if profanity detected", async () => {
  const mock = new MockMessage(profanitySpec).mockContent("oh fuck lol");
  await mock.simulateEvent();
  mock.expectReactedWith(GUILD_EMOJIS.NEKO_GUN);
});
