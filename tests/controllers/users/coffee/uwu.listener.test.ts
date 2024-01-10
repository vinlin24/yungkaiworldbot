import uwuSpec from "../../../../src/controllers/users/coffee/uwu.listener";
import { MockMessage } from "../../../test-utils";

it("should react with vomit", async () => {
  const mock = new MockMessage(uwuSpec).mockContent("uwu");
  await mock.simulateEvent();
  mock.expectReactedWith("🤢", "🤮");
});
