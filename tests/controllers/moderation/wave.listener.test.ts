import { Message } from "discord.js";
import waveSpec from "../../../src/controllers/moderation/wave.listener";
import { MockMessage } from "../../test-utils";

it("should wave at what looks like an introduction", async () => {
  const mock = new MockMessage(waveSpec)
    .mockChannel({ name: "introductions" })
    .mockContent("hi i'm joe");
  await mock.simulateEvent();
  mock.expectReactedWith("👋");
});

it("should ignore messages that are replies", async () => {
  const mock = new MockMessage(waveSpec)
    .mockChannel({ name: "introductions" })
    .mockContent("hi joe i'm dave")
    .mockReference({ content: "hi i'm joe" } as Message);
  await mock.simulateEvent();
  mock.expectNotResponded();
});
