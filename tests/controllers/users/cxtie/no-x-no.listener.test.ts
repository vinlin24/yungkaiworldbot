import noXNoSpec from "../../../../src/controllers/users/cxtie/no-x-no.listener";
import { MockMessage } from "../../../test-utils";

describe("no-x-no listener", () => {
  it("should respond with 'no <display name> no'", async () => {
    const mock = new MockMessage(noXNoSpec)
      .mockAuthor({ displayName: "tempbotfan" })
      .mockContent("no bro no");
    await mock.simulateEvent();
    mock.expectRepliedSilentlyWith({ content: "no tempbotfan no" });
  });
});
