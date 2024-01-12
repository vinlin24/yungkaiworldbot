import config from "../../../../src/config";
import coffeeAppreciationSpec from "../../../../src/controllers/users/coffee/appreciation.listener";
import { GUILD_EMOJIS } from "../../../../src/utils/emojis.utils";
import { MockMessage } from "../../../test-utils";

const KOFI_EMOJI = `<:kofi:${GUILD_EMOJIS.KOFI}>`;

it("should appreciate coffee when conditions are met", async () => {
  const mock = new MockMessage(coffeeAppreciationSpec)
    .mockContent(`lorem ${KOFI_EMOJI} ipsum`);
  await mock.simulateEvent();
  mock.expectRepliedSilentlyWith("daily kofi appreciation");
});

it("should allow coffee to bypass cooldown", async () => {
  const mock = new MockMessage(coffeeAppreciationSpec)
    .mockContent(`lorem ${KOFI_EMOJI} ipsum`)
    .mockAuthor({ uid: config.COFFEE_UID });

  await mock.simulateEvent();
  await mock.simulateEvent();

  expect(mock.message.reply).toHaveBeenCalledTimes(2);
});
