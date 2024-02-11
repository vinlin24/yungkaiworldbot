import env from "../../../../src/config";
import randomReacterSpec from "../../../../src/controllers/users/cxtie/timer-reacter.listener";
import cxtieService from "../../../../src/services/cxtie.service";
import { GUILD_EMOJIS } from "../../../../src/utils/emojis.utils";
import { MockMessage, spyOnRandom } from "../../../test-utils";

describe("anti-cxtie listener", () => {
  let mock: MockMessage;
  beforeEach(() => {
    mock = new MockMessage(randomReacterSpec)
      .mockAuthor({ uid: env.CXTIE_UID });
  });

  describe("should react randomly based on chance computed by service", () => {
    it("should meow", async () => {
      jest.spyOn(cxtieService, "reactChance", "get").mockReturnValueOnce(0.05);
      spyOnRandom().mockReturnValueOnce(0.01);

      await mock.simulateEvent();

      mock.expectReactedWith(GUILD_EMOJIS.HMM, "⏲️", "❓");
    });

    it("shouldn't react", async () => {
      jest.spyOn(cxtieService, "reactChance", "get").mockReturnValueOnce(0.05);
      spyOnRandom().mockReturnValueOnce(0.42);

      await mock.simulateEvent();

      mock.expectNotResponded();
    });

    it("shouldn't react and then react (dynamic meow chance)", async () => {
      jest.spyOn(cxtieService, "reactChance", "get")
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
