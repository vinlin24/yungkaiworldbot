import deezSpec from "../../../../src/controllers/users/deez/deez.listener";

import { MockMessage } from "../../../test-utils";

describe("deez listener", () => {
  it("should not respond if the content isn't deez", async () => {
    const mock = new MockMessage(deezSpec);
    mock.mockContent("lorem ipsum");
    await mock.emitEvent();
    mock.expectNotResponded();
  });

  it("should reply silently with deez if the content is deez", async () => {
    const mock = new MockMessage(deezSpec);
    mock.mockContent("deez");
    await mock.emitEvent();
    mock.expectRepliedSilentlyWith({ content: "deez" });
  });
});
