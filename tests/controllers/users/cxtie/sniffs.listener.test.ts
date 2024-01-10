import config from "../../../../src/config";
import onSniffsSpec from "../../../../src/controllers/users/cxtie/sniffs.listener";
import { MockMessage } from "../../../test-utils";

describe("sniffs listener", () => {
  afterEach(() => {
    jest.spyOn(global.Math, "random").mockRestore();
  })

  it("should echo sniffs half the time", async () => {
    const mock = new MockMessage(onSniffsSpec)
      .mockContent("sniffs")
      .mockAuthor({ uid: config.CXTIE_UID });
    jest.spyOn(global.Math, "random").mockReturnValueOnce(0.99);
    await mock.simulateEvent();
    mock.expectRepliedSilentlyWith({ content: "sniffs" });
  });

  it("should appreciatie cxtie half the time", async () => {
    const mock = new MockMessage(onSniffsSpec)
      .mockContent("sniffs")
      .mockAuthor({ uid: config.CXTIE_UID });
    jest.spyOn(global.Math, "random").mockReturnValueOnce(0);
    await mock.simulateEvent();
    mock.expectRepliedSilentlyWith({ content: "daily cxtie appreciation" });
  });
});
