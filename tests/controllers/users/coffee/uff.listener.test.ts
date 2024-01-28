import env from "../../../../src/config";
import uffSpec from "../../../../src/controllers/users/coffee/uff.listener";
import { MockMessage } from "../../../test-utils";

let mock: MockMessage;
beforeEach(() => { mock = new MockMessage(uffSpec); });

it("should bark in response to uff if from coffee", async () => {
  mock.mockAuthor({ uid: env.COFFEE_UID }).mockContent("uff");
  await mock.simulateEvent();
  mock.expectRepliedSilentlyWith("woof");
});

it("should do nothing if the sender isn't coffee", async () => {
  mock.mockContent("uff");
  await mock.simulateEvent();
  mock.expectNotResponded();
});

it("should trigger even on extended uff", async () => {
  mock.mockAuthor({ uid: env.COFFEE_UID }).mockContent("ufffffffffff");
  await mock.simulateEvent();
  mock.expectRepliedSilentlyWith("woof");
});
