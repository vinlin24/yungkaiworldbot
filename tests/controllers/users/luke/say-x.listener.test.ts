import sayXSpec from "../../../../src/controllers/users/luke/say-x.listener";
import { MockMessage } from "../../../test-utils";

let mock: MockMessage;
beforeEach(() => { mock = new MockMessage(sayXSpec); });

it("should echo everything after \"say\"", async () => {
  mock.mockContent("say you won't let go");
  await mock.simulateEvent();
  mock.expectRepliedSilentlyWith("you won't let go");
});

it("should do nothing if the pattern doesn't match", async () => {
  mock.mockContent("hello there");
  await mock.simulateEvent();
  mock.expectNotResponded();
});
