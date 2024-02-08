import { TimestampStyles, bold, time } from "discord.js";

import pingSpec from "../../../src/controllers/dev/ping.command";
import { MockInteraction, TestClient, addMockGetter } from "../../test-utils";

describe("/ping command", () => {
  let mock: MockInteraction;
  beforeEach(() => {
    mock = new MockInteraction(pingSpec);
  });

  it("should respond with latency, branch, startup details", async () => {
    const dummyPing = 42;
    const dummyBranchName = "dummy-branch-name";
    const dummyReadySince = new Date();

    const mockClient = new TestClient();
    mockClient.readySince = dummyReadySince;
    mockClient.stealth = true;
    addMockGetter(mockClient, "branchName", dummyBranchName);
    addMockGetter(mockClient.ws, "ping", dummyPing);
    mock.mockClient(mockClient);

    await mock.simulateCommand();

    const timestamp = time(dummyReadySince);
    const relativeTime = time(dummyReadySince, TimestampStyles.RelativeTime);
    const expectedParts = [
      `Latency: **${dummyPing}**`,
      `Mode: ${bold("Stealth")}`,
      `Branch: \`${dummyBranchName}\``,
      `Ready: ${timestamp} (${relativeTime})`,
    ];
    for (const part of expectedParts) {
      mock.expectRepliedWith({
        content: expect.stringContaining(part),
      });
    }
  });

  it("should not use -1 ping even if latency isn't available yet", async () => {
    addMockGetter(mock.interaction.client.ws, "ping", -1);
    await mock.simulateCommand();
    mock.expectRepliedWith({
      content: expect.not.stringContaining("Latency: **-1** ms"),
    });
  });

  it("should include the latency Easter egg", async () => {
    addMockGetter(mock.interaction.client.ws, "ping", 69);
    await mock.simulateCommand();
    mock.expectRepliedWith({
      content: expect.stringContaining("Latency: **69** ms (nice)"),
    });
  });

  new MockInteraction(pingSpec).testBroadcastOptionSupport();
});
