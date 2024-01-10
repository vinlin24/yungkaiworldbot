const mockedIsPollutionImmuneChannel = jest.fn();

jest.mock("../../../../src/middleware/filters.middleware", () => {
  return {
    ...jest.requireActual("../../../../src/middleware/filters.middleware"),
    isPollutionImmuneChannel: mockedIsPollutionImmuneChannel,
  };
});

import onTempyWempySpec from "../../../../src/controllers/users/cxtie/tempy-wempy.listener";
import { MockMessage } from "../../../test-utils";

it("should react with STOP if in a pollution-immune channel", async () => {
  const mock = new MockMessage(onTempyWempySpec).mockContent("hi tempy wempy!");
  mockedIsPollutionImmuneChannel.mockReturnValueOnce(true);

  await mock.simulateEvent();

  mock.expectReactedWith("🇸", "🇹", "🇴", "🇵");
});

it("should reply with stop if not in a pollution-immune channel", async () => {
  const mock = new MockMessage(onTempyWempySpec).mockContent("hi tempy wempy!");
  mockedIsPollutionImmuneChannel.mockReturnValueOnce(false);

  await mock.simulateEvent();

  mock.expectRepliedSilentlyWith("Stop calling me that.");
});
