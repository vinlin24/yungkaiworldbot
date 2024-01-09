const mockRandom = jest.fn();
const mockMath = Object.create(global.Math);
mockMath.random = mockRandom;
global.Math = mockMath;

jest.mock("../../../../src/services/luke.service");

import config from "../../../../src/config";
import randomMeowerSpec from "../../../../src/controllers/users/luke/random-meow.listener";
import lukeService from "../../../../src/services/luke.service";
import { MockMessage } from "../../../test-utils";

const mockedLukeService = jest.mocked(lukeService);

describe("random-meow listener", () => {
  let mock: MockMessage;
  beforeEach(() => {
    mock = new MockMessage(randomMeowerSpec)
      .mockAuthor({ uid: config.LUKE_UID });
  })

  describe("should meow randomly based on chance computed by service", () => {
    it("should meow", async () => {
      mockedLukeService.getMeowChance.mockReturnValueOnce(0.05);
      mockRandom.mockReturnValueOnce(0.01);

      await mock.simulateEvent();

      mock.expectRepliedSilentlyWith({ content: "meow meow" });
    });

    it("shouldn't meow", async () => {
      mockedLukeService.getMeowChance.mockReturnValueOnce(0.05);
      mockRandom.mockReturnValueOnce(0.42);

      await mock.simulateEvent();

      mock.expectNotResponded();
    });

    it("shouldn't meow and then meow (dynamic meow chance)", async () => {
      mockedLukeService.getMeowChance
        .mockReturnValueOnce(0.05)
        .mockReturnValueOnce(0.95);
      mockRandom.mockReturnValue(0.50);

      await mock.simulateEvent();
      mock.expectNotResponded();

      await mock.simulateEvent();
      mock.expectRepliedSilentlyWith({ content: "meow meow" });
    });
  });
});
