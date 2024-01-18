import deezSpec from "../../../../src/controllers/users/deez/deez.listener";

import { MockMessage } from "../../../test-utils";

let mock: MockMessage;
beforeEach(() => { mock = new MockMessage(deezSpec); });

it("should not respond if the content isn't deez", async () => {
  mock.mockContent("lorem ipsum");
  await mock.simulateEvent();
  mock.expectNotResponded();
});

it("should reply silently with deez if the content is deez", async () => {
  mock.mockContent("deez");
  await mock.simulateEvent();
  mock.expectRepliedSilentlyWith("deez");
});

it("should trigger on and echo extended deez", async () => {
  const extendedDeez = "deeeeeeeeeez";
  mock.mockContent(extendedDeez);
  await mock.simulateEvent();
  mock.expectRepliedSilentlyWith(extendedDeez);
});
