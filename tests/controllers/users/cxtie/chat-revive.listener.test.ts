import chatReviveSpec from "../../../../src/controllers/users/cxtie/chat-revive.listener";
import { MockMessage } from "../../../test-utils";

it("should deny chat revival", async () => {
  const mock = new MockMessage(chatReviveSpec).mockContent("chat revive");
  await mock.simulateEvent();
  mock.expectRepliedSilentlyWith("no");
});

it("should deny chat revival with some basic Markdown", async () => {
  const mock = new MockMessage(chatReviveSpec).mockContent("# CHAT REVIVE");
  await mock.simulateEvent();
  mock.expectRepliedSilentlyWith("no");
});
