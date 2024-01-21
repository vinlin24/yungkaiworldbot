jest.mock("../../../../src/utils/interaction.utils");
jest.mock("../../../../src/services/timeout.service");
jest.mock("../../../../src/middleware/privilege.middleware");

import {
  AuditLogEvent,
  DMChannel,
  EmbedBuilder,
  Guild,
  GuildAuditLogsEntry,
  GuildMember,
  GuildTextBasedChannel,
  MessageCreateOptions,
  MessageFlags,
  TextBasedChannel,
  time,
  userMention,
} from "discord.js";
import { Matcher } from "jest-mock-extended";

import { ListenerRunner } from "../../../../src/bot/listener.runner";
import config from "../../../../src/config";
import timeoutBroadcastSpec from "../../../../src/controllers/moderation/timeout/timeout-broadcast.listener";
import {
  checkPrivilege,
} from "../../../../src/middleware/privilege.middleware";
import timeoutService from "../../../../src/services/timeout.service";
import { getDMChannel } from "../../../../src/utils/interaction.utils";

const mockedTimeoutService = jest.mocked(timeoutService);
const mockedCheckPrivilege = jest.mocked(checkPrivilege);

const mockedGetDMChannel = jest.mocked(getDMChannel);

const runner = new ListenerRunner(timeoutBroadcastSpec);
const simulateEvent = runner.callbackToRegister;

const dummyExecutor = {
  id: "123456789",
  user: {
    username: "dummyexecutor",
  },
  timeout: jest.fn(),
} as unknown as GuildMember;

const dummyTarget = {
  id: "987654321",
  user: {
    username: "dummytarget",
  },
  timeout: jest.fn(),
} as unknown as GuildMember;

const dummyUntil = new Date();

const mockTimeoutIssuedEntry = {
  action: AuditLogEvent.MemberUpdate,
  executorId: dummyExecutor.id,
  targetId: dummyTarget.id,
  reason: "for being weird",
  changes: [
    {
      key: "communication_disabled_until",
      old: undefined,
      new: dummyUntil.toISOString(),
    },
  ],
} as GuildAuditLogsEntry;

const mockTimeoutRemovedEntry = {
  action: AuditLogEvent.MemberUpdate,
  executorId: dummyExecutor.id,
  targetId: dummyTarget.id,
  reason: null,
  changes: [
    {
      key: "communication_disabled_until",
      old: dummyUntil.toISOString(),
      new: undefined,
    },
  ],
} as GuildAuditLogsEntry;

const mockDMChannel = {
  send: jest.fn(),
} as unknown as DMChannel;

const mockBroadcastChannel = {
  send: jest.fn(),
} as unknown as GuildTextBasedChannel;

const mockGuild = {
  id: config.YUNG_KAI_WORLD_GID,
  name: "yung kai world",
  members: {
    fetch: jest.fn(id => {
      if (id === dummyExecutor.id) return Promise.resolve(dummyExecutor);
      if (id === dummyTarget.id) return Promise.resolve(dummyTarget);
      return Promise.resolve(null);
    }),
  },
  channels: {
    fetch: jest.fn(id => {
      if (id === config.BOT_SPAM_CID) {
        return Promise.resolve(mockBroadcastChannel);
      }
      return Promise.resolve(null);
    }),
  },
  client: {
    user: {
      id: config.CLIENT_UID,
    },
  },
} as unknown as Guild;

beforeEach(() => {
  mockedGetDMChannel.mockResolvedValue(mockDMChannel);
});

describe("rejecting event", () => {
  it("should do nothing if guild is not yung kai world", async () => {
    await simulateEvent(mockTimeoutIssuedEntry, { id: "4242424242" } as Guild);
    expect(mockDMChannel.send).not.toHaveBeenCalled();
    expect(mockBroadcastChannel.send).not.toHaveBeenCalled();
  });

  it("should do nothing if entry is not a member update event", async () => {
    const mockEntryOverride = {
      ...mockTimeoutIssuedEntry,
      action: AuditLogEvent.MessageDelete,
    } as GuildAuditLogsEntry;
    await simulateEvent(mockEntryOverride, mockGuild);
    expect(mockDMChannel.send).not.toHaveBeenCalled();
    expect(mockBroadcastChannel.send).not.toHaveBeenCalled();
  });

  it("should do nothing if entry is not a timeout update", async () => {
    const mockEntryOverride = {
      ...mockTimeoutIssuedEntry,
      changes: [
        {
          key: "nick",
          old: "hello there",
          new: "general kenobi",
        },
      ],
    } as GuildAuditLogsEntry;
    await simulateEvent(mockEntryOverride, mockGuild);
    expect(mockDMChannel.send).not.toHaveBeenCalled();
    expect(mockBroadcastChannel.send).not.toHaveBeenCalled();
  });
});

function expectSentEmbedTo(
  channel: TextBasedChannel,
  matcher: Matcher<EmbedBuilder>,
): void {
  expect(channel.send).toHaveBeenCalledWith(
    expect.objectContaining<MessageCreateOptions>({
      // @ts-expect-error Claims I need APIEmbed but is actually EmbedBuilder.
      embeds: [matcher],
      flags: MessageFlags.SuppressNotifications,
    }),
  );
}

const issuedEmbedMatcher = new Matcher<EmbedBuilder>(embed => {
  const requirements = [
    embed.data.title?.includes(mockGuild.name),
    embed.data.title?.includes("Timeout Issued"),
    embed.data.description?.includes(userMention(dummyTarget.id)),
    embed.data.description?.includes(userMention(dummyExecutor.id)),
    embed.data.description?.includes(mockTimeoutIssuedEntry.reason!),
    embed.data.description?.includes(time(dummyUntil)),
  ];
  return requirements.every(Boolean);
}, "issued embed matcher");

const removedEmbedMatcher = new Matcher<EmbedBuilder>(embed => {
  const requirements = [
    embed.data.title?.includes(mockGuild.name),
    embed.data.title?.includes("Timeout Removed"),
    embed.data.description?.includes(userMention(dummyTarget.id)),
    embed.data.description?.includes(userMention(dummyExecutor.id)),
  ];
  return requirements.every(Boolean);
}, "removed embed matcher");

describe("error handling", () => {
  it("should still try to DM if broadcast channel not found", async () => {
    // @ts-expect-error fetch() can resolve to null. IDK why it says it can't.
    jest.mocked(mockGuild.channels.fetch).mockResolvedValueOnce(null);
    await simulateEvent(mockTimeoutIssuedEntry, mockGuild);
    expect(mockDMChannel.send).toHaveBeenCalled();
    expect(mockBroadcastChannel.send).not.toHaveBeenCalled();
  });

  it("should still try to broadcast even if DM fails", async () => {
    const dummyError = new Error("DUMMY-ERROR");
    jest.mocked(mockDMChannel.send).mockRejectedValueOnce(dummyError);
    await simulateEvent(mockTimeoutIssuedEntry, mockGuild);
    expectSentEmbedTo(mockDMChannel, issuedEmbedMatcher);
    expectSentEmbedTo(mockBroadcastChannel, issuedEmbedMatcher);
  });

  it("should still try to deny timeout even if sending fails", async () => {
    const dummyError = new Error("DUMMY-ERROR");
    jest.mocked(mockDMChannel.send).mockRejectedValueOnce(dummyError);
    // @ts-expect-error fetch() can resolve to null. IDK why it says it can't.
    jest.mocked(mockGuild.channels.fetch).mockResolvedValueOnce(null);
    mockedTimeoutService.isImmune.mockReturnValue(true);
    // @ts-expect-error Narrowing CommandCheck | boolean to boolean.
    mockedCheckPrivilege.mockReturnValue(false);

    await simulateEvent(mockTimeoutIssuedEntry, mockGuild);

    expect(dummyTarget.timeout).toHaveBeenCalledWith(null);
  });
});

describe("timeout issued", () => {
  it("should DM the targeted member", async () => {
    await simulateEvent(mockTimeoutIssuedEntry, mockGuild);
    expectSentEmbedTo(mockDMChannel, issuedEmbedMatcher);
  });

  it("should send in the broadcast channel", async () => {
    await simulateEvent(mockTimeoutIssuedEntry, mockGuild);
    expectSentEmbedTo(mockBroadcastChannel, issuedEmbedMatcher);
  });
});

describe("timeout removed", () => {
  it("should DM the targeted member", async () => {
    await simulateEvent(mockTimeoutRemovedEntry, mockGuild);
    expectSentEmbedTo(mockDMChannel, removedEmbedMatcher);
  });

  it("should send in the broadcast channel", async () => {
    await simulateEvent(mockTimeoutRemovedEntry, mockGuild);
    expectSentEmbedTo(mockBroadcastChannel, removedEmbedMatcher);
  });
});

describe("timeout immunity", () => {
  it("should undo the timeout if member is immune", async () => {
    mockedTimeoutService.isImmune.mockReturnValue(true);
    // @ts-expect-error Narrowing CommandCheck | boolean to boolean.
    mockedCheckPrivilege.mockReturnValue(false);
    await simulateEvent(mockTimeoutIssuedEntry, mockGuild);
    expectSentEmbedTo(mockDMChannel, issuedEmbedMatcher);
    expectSentEmbedTo(mockBroadcastChannel, issuedEmbedMatcher);
    expect(dummyTarget.timeout).toHaveBeenCalledWith(null);
  });

  it("should allow alpha mods to bypass timeout immunity", async () => {
    mockedTimeoutService.isImmune.mockReturnValue(true);
    // @ts-expect-error Narrowing CommandCheck | boolean to boolean.
    mockedCheckPrivilege.mockReturnValue(true);
    await simulateEvent(mockTimeoutIssuedEntry, mockGuild);
    expectSentEmbedTo(mockDMChannel, issuedEmbedMatcher);
    expectSentEmbedTo(mockBroadcastChannel, issuedEmbedMatcher);
    expect(dummyTarget.timeout).not.toHaveBeenCalledWith(null);
  });
});
