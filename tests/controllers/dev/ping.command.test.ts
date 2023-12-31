import pingSpec from "../../../src/controllers/dev/ping.command";

import {
  MockInteraction,
  addMockGetter
} from "../../test-utils";

const mock = new MockInteraction(pingSpec);

describe("/ping command", () => {
  it("should respond with a message, latency, and branch details", async () => {
    const dummyPing = 42;
    addMockGetter(mock.interaction.client.ws, "ping", dummyPing);

    await mock.runCommand();

    const expectedParts = [
      "Hello there!",
      `Latency: **${dummyPing}**`,
      "Branch: ",
    ];
    for (const part of expectedParts) {
      mock.expectRepliedWith({
        content: expect.stringContaining(part),
      });
    }
  });

  it("should not use -1 ping even if latency isn't available yet", async () => {
    addMockGetter(mock.interaction.client.ws, "ping", -1);
    await mock.runCommand();
    mock.expectRepliedWith({
      content: expect.not.stringContaining("Latency: **-1** ms"),
    });
  });

  it("should include the latency Easter egg", async () => {
    addMockGetter(mock.interaction.client.ws, "ping", 69);
    await mock.runCommand();
    mock.expectRepliedWith({
      content: expect.stringContaining("Latency: **69** ms (nice)"),
    });
  });

  mock.testBroadcastOptionSupport();
});
