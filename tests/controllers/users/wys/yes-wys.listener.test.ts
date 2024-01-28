import env from "../../../../src/config";
import yesWysSpec from "../../../../src/controllers/users/wys/yes-wys.listener";
import { MockMessage, spyOnRandom } from "../../../test-utils";

it("should randomly reply to wys with yes wys", async () => {
  const mock = new MockMessage(yesWysSpec).mockAuthor({ uid: env.WYS_UID });
  spyOnRandom().mockReturnValueOnce(0.01);
  await mock.simulateEvent();
  mock.expectRepliedSilentlyWith("yes wys");
});
