import { bold } from "discord.js";

import tempbotAppreciationSpec from "../../../../src/controllers/users/ni/tempbot-appreciation.listener";
import { GUILD_EMOJIS } from "../../../../src/utils/emojis.utils";
import { MockMessage } from "../../../test-utils";

it("should react with neko uwu upon appreciation", async () => {
  const mock = new MockMessage(tempbotAppreciationSpec)
    .mockContent("daily tempbot appreciation");
  await mock.simulateEvent();
  mock.expectReactedWith(GUILD_EMOJIS.NEKO_UWU);
});

it("should still trigger on 'tempbotni', with possible markup", async () => {
  const mock = new MockMessage(tempbotAppreciationSpec)
    .mockContent(`DAILY TEMPBOT${bold("NI")} APPRECIATION`);
  await mock.simulateEvent();
  mock.expectReactedWith(GUILD_EMOJIS.NEKO_UWU);
});
