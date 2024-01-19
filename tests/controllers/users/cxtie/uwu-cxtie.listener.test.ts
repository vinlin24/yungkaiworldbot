import uwuCxtieSpec from "../../../../src/controllers/users/cxtie/uwu-cxtie.listener";
import { MockMessage } from "../../../test-utils";

it("should reply with UWU CXTIE", async () => {
  const mock = new MockMessage(uwuCxtieSpec).mockContent("uwu cxtie");
  await mock.simulateEvent();
  mock.expectRepliedSilentlyWith("UWU CXTIE");
});
