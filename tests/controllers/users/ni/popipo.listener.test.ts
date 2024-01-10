jest.mock("../../../../src/utils/math.utils");

import config from "../../../../src/config";
import onPopipoSpec from "../../../../src/controllers/users/ni/popipo.listener";
import { randRange } from "../../../../src/utils/math.utils";
import { MockMessage } from "../../../test-utils";

const mockRandRange = jest.mocked(randRange);

describe("popipo listener", () => {
  it("should respond with a random number of popi's + po", async () => {
    const mock = new MockMessage(onPopipoSpec).mockContent("popipo");
    mockRandRange.mockReturnValueOnce(3);
    await mock.simulateEvent();
    mock.expectRepliedSilentlyWith({ content: "popipopipopipo" });
  });

  it("should respond as long as 'popipo' is in the content", async () => {
    const mock = new MockMessage(onPopipoSpec).mockContent("popipopipopipo");
    mockRandRange.mockReturnValueOnce(4);
    await mock.simulateEvent();
    mock.expectRepliedSilentlyWith({ content: "popipopipopipopipo" });
  });

  it("should allow Ni to bypass cooldown", async () => {
    const mock = new MockMessage(onPopipoSpec)
      .mockContent("popipopipopipo")
      .mockAuthor({ uid: config.NI_UID });
    mockRandRange.mockReturnValueOnce(2);
    await mock.simulateEvent();
    await mock.simulateEvent();
    expect(mock.message.reply).toHaveBeenCalledTimes(2);
  });
});
