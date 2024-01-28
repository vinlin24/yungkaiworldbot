jest.mock("../../../../src/services/luke.service");

import env from "../../../../src/config";
import randomMeowerSpec from "../../../../src/controllers/users/luke/random-meow.listener";
import lukeService from "../../../../src/services/luke.service";
import { MockMessage, spyOnRandom } from "../../../test-utils";

const mockedLukeService = jest.mocked(lukeService);

describe("random-meow listener", () => {
  let mock: MockMessage;
  beforeEach(() => {
    mock = new MockMessage(randomMeowerSpec)
      .mockAuthor({ uid: env.LUKE_UID });
  });

  describe("should meow randomly based on chance computed by service", () => {
    it("should meow", async () => {
      mockedLukeService.getMeowChance.mockReturnValueOnce(0.05);
      spyOnRandom().mockReturnValueOnce(0.01);

      await mock.simulateEvent();

      mock.expectRepliedSilentlyWith({ content: "meow meow" });
    });

    it("shouldn't meow", async () => {
      mockedLukeService.getMeowChance.mockReturnValueOnce(0.05);
      spyOnRandom().mockReturnValueOnce(0.42);

      await mock.simulateEvent();

      mock.expectNotResponded();
    });

    it("shouldn't meow and then meow (dynamic meow chance)", async () => {
      mockedLukeService.getMeowChance
        .mockReturnValueOnce(0.05)
        .mockReturnValueOnce(0.95);
      spyOnRandom().mockReturnValue(0.50);

      await mock.simulateEvent();
      mock.expectNotResponded();

      await mock.simulateEvent();
      mock.expectRepliedSilentlyWith({ content: "meow meow" });
    });
  });
});
