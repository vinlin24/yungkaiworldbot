import config from "../../../../src/config";
import tacocatAppreciationSpec from "../../../../src/controllers/users/wav/tacocat-appreciation.listener";
import { MockMessage } from "../../../test-utils";

it("should appreciate tacocat when conditions are met", async () => {
  const mock = new MockMessage(tacocatAppreciationSpec)
    .mockAuthor({ uid: config.WAV_UID })
    .mockContent("$im tacocat");
  await mock.simulateEvent();
  mock.expectRepliedSilentlyWith("daily tacocat appreciation");
});
