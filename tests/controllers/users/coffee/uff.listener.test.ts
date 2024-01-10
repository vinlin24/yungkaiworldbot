import config from "../../../../src/config";
import uffSpec from "../../../../src/controllers/users/coffee/uff.listener";
import { MockMessage } from "../../../test-utils";

it("should bark in response to uff if from coffee", async () => {
  const mock = new MockMessage(uffSpec)
    .mockAuthor({ uid: config.COFFEE_UID })
    .mockContent("uff");
  await mock.simulateEvent();
  mock.expectRepliedSilentlyWith({ content: "woof" });
});

it("should do nothing if the sender isn't coffee", async () => {
  const mock = new MockMessage(uffSpec).mockContent("uff");
  await mock.simulateEvent();
  mock.expectNotResponded();
});
