jest.mock("../../../../src/services/cxtie.service");

import config from "../../../../src/config";
import randomReacterSpec from "../../../../src/controllers/users/cxtie/timer-reacter.listener";
import cxtieService from "../../../../src/services/cxtie.service";
import { GUILD_EMOJIS } from "../../../../src/utils/emojis.utils";
import { MockMessage, addMockGetter, spyOnRandom } from "../../../test-utils";

const mockedCxtieService = jest.mocked(cxtieService);
const mockReactChanceGetter = jest.fn();
addMockGetter(mockedCxtieService, "reactChance", () => mockReactChanceGetter());

describe("anti-cxtie listener", () => {
  let mock: MockMessage;
  beforeEach(() => {
    mock = new MockMessage(randomReacterSpec)
      .mockAuthor({ uid: config.CXTIE_UID });
  });

  describe("should react randomly based on chance computed by service", () => {
    it("should meow", async () => {
      mockReactChanceGetter.mockReturnValueOnce(0.05);
      spyOnRandom().mockReturnValueOnce(0.01);

      await mock.simulateEvent();

      mock.expectReactedWith(GUILD_EMOJIS.HMM, "⏲️", "❓");
    });

    it("shouldn't react", async () => {
      mockReactChanceGetter.mockReturnValueOnce(0.05);
      spyOnRandom().mockReturnValueOnce(0.42);

      await mock.simulateEvent();

      mock.expectNotResponded();
    });

    it("shouldn't react and then react (dynamic meow chance)", async () => {
      mockReactChanceGetter
        .mockReturnValueOnce(0.05)
        .mockReturnValueOnce(0.95);
      spyOnRandom().mockReturnValue(0.50);

      await mock.simulateEvent();
      mock.expectNotResponded();

      await mock.simulateEvent();
      mock.expectReactedWith(GUILD_EMOJIS.HMM, "⏲️", "❓");
    });
  });
});
