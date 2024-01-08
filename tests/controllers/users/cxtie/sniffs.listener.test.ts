const mockRandom = jest.fn();
const mockMath = Object.create(global.Math);
mockMath.random = mockRandom;
global.Math = mockMath;

import config from "../../../../src/config";
import onSniffsSpec from "../../../../src/controllers/users/cxtie/sniffs.listener";
import { MockMessage } from "../../../test-utils";

describe("sniffs listener", () => {
  it("should echo sniffs half the time", async () => {
    const mock = new MockMessage(onSniffsSpec)
      .mockContent("sniffs")
      .mockAuthor({ uid: config.CXTIE_UID });
    mockRandom.mockReturnValueOnce(0.99);
    await mock.simulateEvent();
    mock.expectRepliedSilentlyWith({ content: "sniffs" });
  });

  it("should appreciatie cxtie half the time", async () => {
    const mock = new MockMessage(onSniffsSpec)
      .mockContent("sniffs")
      .mockAuthor({ uid: config.CXTIE_UID });
    mockRandom.mockReturnValueOnce(0);
    await mock.simulateEvent();
    mock.expectRepliedSilentlyWith({ content: "daily cxtie appreciation" });
  });
});
