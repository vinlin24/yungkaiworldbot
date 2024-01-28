jest.mock("../../../../src/services/luke.service");

import env from "../../../../src/config";
import randomMeowerSpec from "../../../../src/controllers/users/luke/random-meow.listener";
import lukeService from "../../../../src/services/luke.service";
import { MockMessage, spyOnRandom } from "../../../test-utils";

const mockedLukeService = jest.mocked(lukeService);

let mock: MockMessage;
beforeEach(() => {
  mock = new MockMessage(randomMeowerSpec).mockAuthor({ uid: env.LUKE_UID });
});

describe("replying randomly based on chance computed by service", () => {
  it("should reply", async () => {
    mockedLukeService.getMeowChance.mockReturnValueOnce(0.05);
    spyOnRandom().mockReturnValueOnce(0.01);

    await mock.simulateEvent();

    mock.expectReplied();
  });

  it("shouldn't reply", async () => {
    mockedLukeService.getMeowChance.mockReturnValueOnce(0.05);
    spyOnRandom().mockReturnValueOnce(0.42);

    await mock.simulateEvent();

    mock.expectNotResponded();
  });

  it("shouldn't reply and then reply (dynamic meow chance)", async () => {
    mockedLukeService.getMeowChance
      .mockReturnValueOnce(0.05)
      .mockReturnValueOnce(0.95);
    spyOnRandom().mockReturnValue(0.50);

    await mock.simulateEvent();
    mock.expectNotResponded();

    await mock.simulateEvent();
    mock.expectReplied();
  });
});
