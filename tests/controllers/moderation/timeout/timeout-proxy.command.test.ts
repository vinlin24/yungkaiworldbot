import { GuildMember } from "discord.js";

import { ALPHA_MOD_RID, BABY_MOD_RID } from "../../../../src/config";
import timeoutProxySpec from "../../../../src/controllers/moderation/timeout/timeout-proxy.command";
import { RoleLevel } from "../../../../src/middleware/privilege.middleware";
import { MockInteraction } from "../../../test-utils";

let mock: MockInteraction;
beforeEach(() => {
  mock = new MockInteraction(timeoutProxySpec)
    .mockCaller({ roleIds: [ALPHA_MOD_RID] })
    .mockOption("User", "user", mockTarget);
});

const mockTarget = {
  timeout: jest.fn(),
  user: {
    username: "dummyuser",
  },
} as unknown as GuildMember;

it("should require privilege level >= ALPHA_MOD", async () => {
  const unprivilegedMock = new MockInteraction(timeoutProxySpec)
    .mockCaller({ roleIds: [BABY_MOD_RID] })
    .mockOption("User", "user", mockTarget);

  await unprivilegedMock.simulateCommand();

  unprivilegedMock.expectMentionedMissingPrivilege(RoleLevel.ALPHA_MOD);
});

it("should time out the user for 1 minute by default", async () => {
  await mock.simulateCommand();

  expect(mockTarget.timeout).toHaveBeenCalledWith(60_000, undefined);
  mock.expectRepliedGenericACK();
});

it("should time out the user for the time specified", async () => {
  mock.mockOption("String", "duration", "16 min");

  await mock.simulateCommand();

  expect(mockTarget.timeout).toHaveBeenCalledWith(16 * 60_000, undefined);
  mock.expectRepliedGenericACK();
});

it("should time out the user with the provided reason", async () => {
  mock
    .mockOption("String", "duration", "12 min")
    .mockOption("String", "reason", "because i can");

  await mock.simulateCommand();

  expect(mockTarget.timeout).toHaveBeenCalledWith(12 * 60_000, "because i can");
  mock.expectRepliedGenericACK();
});

it("should assume units of minutes if units are omitted", async () => {
  mock.mockOption("String", "duration", "50");

  await mock.simulateCommand();

  expect(mockTarget.timeout).toHaveBeenCalledWith(50 * 60_000, undefined);
  mock.expectRepliedGenericACK();
});
