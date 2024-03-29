jest.mock("../../../../src/utils/interaction.utils");
jest.mock("../../../../src/services/timeout.service");
jest.mock("../../../../src/middleware/privilege.middleware");
jest.mock("../../../../src/types/errors.types");

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
import { DeepMockProxy, Matcher, mockDeep } from "jest-mock-extended";
import { cloneDeep } from "lodash";

import { ListenerRunner } from "../../../../src/bot/listener.runner";
import env, {
  BOT_SPAM_CID,
  MOD_CHAT_CID,
  YUNG_KAI_WORLD_GID,
} from "../../../../src/config";
import timeoutBroadcastSpec from "../../../../src/controllers/moderation/timeout/timeout-broadcast.listener";
import {
  checkPrivilege,
} from "../../../../src/middleware/privilege.middleware";
import timeoutService from "../../../../src/services/timeout.service";
import { isCannotSendToThisUser } from "../../../../src/types/errors.types";
import { getDMChannel } from "../../../../src/utils/interaction.utils";
import { addMockGetter } from "../../../test-utils";

const mockedIsCannotSendToThisUser = jest.mocked(isCannotSendToThisUser);
const mockedTimeoutService = jest.mocked(timeoutService);
const mockedCheckPrivilege = jest.mocked(checkPrivilege);
const mockedGetDMChannel = jest.mocked(getDMChannel);

const runner = new ListenerRunner(timeoutBroadcastSpec);
const simulateEvent = runner.callbackToRegister;

const dummyUntil = new Date();

let mockGuild: DeepMockProxy<Guild>;
let dummyExecutor: DeepMockProxy<GuildMember>;
let dummyTarget: DeepMockProxy<GuildMember>;
let mockTimeoutIssuedEntry: DeepMockProxy<GuildAuditLogsEntry>;
let mockTimeoutRemovedEntry: DeepMockProxy<GuildAuditLogsEntry>;
let mockDMChannel: DeepMockProxy<DMChannel>;
let mockBroadcastChannel: DeepMockProxy<GuildTextBasedChannel>;
let mockModChannel: DeepMockProxy<GuildTextBasedChannel>;

beforeEach(() => {
  mockGuild = mockDeep<Guild>();
  mockGuild.id = YUNG_KAI_WORLD_GID;
  mockGuild.name = "yung kai world";
  mockGuild.client.user.id = env.CLIENT_UID;
  // @ts-expect-error Narrow options type to just user ID.
  mockGuild.members.fetch.mockImplementation(id => {
    if (id === dummyExecutor.id) return Promise.resolve(dummyExecutor);
    if (id === dummyTarget.id) return Promise.resolve(dummyTarget);
    return Promise.resolve(null);
  });
  // @ts-expect-error I don't even know at this point.
  mockGuild.channels.fetch.mockImplementation(id => {
    if (id === BOT_SPAM_CID) {
      return Promise.resolve(mockBroadcastChannel);
    }
    if (id === MOD_CHAT_CID) {
      return Promise.resolve(mockModChannel);
    }
    return Promise.resolve(null);
  });

  dummyExecutor = mockDeep<GuildMember>();
  addMockGetter(dummyExecutor, "id", "123456789");
  dummyExecutor.user.username = "dummyexecutor";

  dummyTarget = mockDeep<GuildMember>();
  addMockGetter(dummyTarget, "id", "98765421");
  dummyTarget.user.username = "dummytarget";

  mockTimeoutIssuedEntry = mockDeep<GuildAuditLogsEntry>();
  mockTimeoutIssuedEntry.action = AuditLogEvent.MemberUpdate;
  mockTimeoutIssuedEntry.executorId = dummyExecutor.id;
  mockTimeoutIssuedEntry.targetId = dummyTarget.id;
  mockTimeoutIssuedEntry.reason = "for being weird";
  mockTimeoutIssuedEntry.changes = [
    {
      key: "communication_disabled_until",
      old: undefined,
      new: dummyUntil.toISOString(),
    },
  ];

  mockTimeoutRemovedEntry = mockDeep<GuildAuditLogsEntry>();
  mockTimeoutRemovedEntry.action = AuditLogEvent.MemberUpdate;
  mockTimeoutRemovedEntry.executorId = dummyExecutor.id;
  mockTimeoutRemovedEntry.targetId = dummyTarget.id;
  mockTimeoutRemovedEntry.reason = null;
  mockTimeoutRemovedEntry.changes = [
    {
      key: "communication_disabled_until",
      old: dummyUntil.toISOString(),
      new: undefined,
    },
  ];

  mockDMChannel = mockDeep<DMChannel>();
  mockBroadcastChannel = mockDeep<GuildTextBasedChannel>();
  mockModChannel = mockDeep<GuildTextBasedChannel>();

  mockedGetDMChannel.mockResolvedValue(mockDMChannel);
  jest.spyOn(console, "error").mockImplementation(() => { });
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
  notifications: boolean = false,
): void {
  const options: MessageCreateOptions = {
    // @ts-expect-error Claims I need APIEmbed but is actually EmbedBuilder.
    embeds: [matcher],
  };
  if (!notifications) {
    options.flags = MessageFlags.SuppressNotifications;
  }

  expect(channel.send).toHaveBeenCalledWith(
    expect.objectContaining<MessageCreateOptions>(options),
  );
}

function getIssuedEmbedMatcher(until: Date): Matcher<EmbedBuilder> {
  const issuedEmbedMatcher = new Matcher<EmbedBuilder>(embed => {
    const requirements = [
      embed.data.title?.includes(mockGuild.name),
      embed.data.title?.includes("Timeout Issued"),
      embed.data.description?.includes(userMention(dummyTarget.id)),
      embed.data.description?.includes(userMention(dummyExecutor.id)),
      embed.data.description?.includes("Duration"),
      embed.data.description?.includes(time(until)),
      embed.data.description?.includes(mockTimeoutIssuedEntry.reason!),
    ];
    return requirements.every(Boolean);
  }, "issued embed matcher");
  return issuedEmbedMatcher;
}

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
  const issuedEmbedMatcher = getIssuedEmbedMatcher(dummyUntil);

  it("should still try to DM if broadcast channel not found", async () => {
    // @ts-expect-error fetch() can resolve to null. IDK why it says it can't.
    mockGuild.channels.fetch.mockResolvedValueOnce(null);
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

  it("should still try to DM even if broadcast fails", async () => {
    const dummyError = new Error("DUMMY-ERROR");
    jest.mocked(mockBroadcastChannel.send).mockRejectedValueOnce(dummyError);

    await simulateEvent(mockTimeoutIssuedEntry, mockGuild);

    expectSentEmbedTo(mockDMChannel, issuedEmbedMatcher);
    expectSentEmbedTo(mockBroadcastChannel, issuedEmbedMatcher);
  });

  it("should still try to broadcast even if target disabled DMs", async () => {
    const dummyError = new Error("pretend this is a DiscordAPIError");
    jest.mocked(mockDMChannel.send).mockRejectedValueOnce(dummyError);
    mockedIsCannotSendToThisUser.mockReturnValueOnce(true);

    await simulateEvent(mockTimeoutIssuedEntry, mockGuild);

    expectSentEmbedTo(mockDMChannel, issuedEmbedMatcher);
    expectSentEmbedTo(mockBroadcastChannel, issuedEmbedMatcher);
  });

  it("should still try to deny timeout even if sending fails", async () => {
    const dummyError = new Error("DUMMY-ERROR");
    jest.mocked(mockDMChannel.send).mockRejectedValueOnce(dummyError);
    // @ts-expect-error fetch() can resolve to null. IDK why it says it can't.
    jest.mocked(mockGuild.channels.fetch).mockResolvedValueOnce(null);
    mockedTimeoutService.isImmune.mockReturnValueOnce(true);
    // @ts-expect-error Narrowing CommandCheck | boolean to boolean.
    mockedCheckPrivilege.mockReturnValueOnce(false);

    await simulateEvent(mockTimeoutIssuedEntry, mockGuild);

    expect(dummyTarget.timeout).toHaveBeenCalledWith(null);
  });
});

describe("timeout issued", () => {
  const issuedEmbedMatcher = getIssuedEmbedMatcher(dummyUntil);

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

function mockTimeoutApplicability(options: {
  immunity?: boolean;
  rateLimited?: boolean;
  alphaOverride?: boolean;
}): void {
  mockedTimeoutService.isImmune.mockReturnValue(!!options.immunity);
  mockedTimeoutService.reportIssued.mockReturnValue(!options.rateLimited);
  // @ts-expect-error Narrowing CommandCheck | boolean to boolean.
  mockedCheckPrivilege.mockReturnValue(!!options.alphaOverride);
}

describe("timeout immunity", () => {
  it("should consult service for immunity status", async () => {
    await simulateEvent(mockTimeoutIssuedEntry, mockGuild);
    expect(mockedTimeoutService.isImmune).toHaveBeenCalledWith(dummyTarget.id);
  });

  it("should undo the timeout if member is immune", async () => {
    mockTimeoutApplicability({ immunity: true });
    await simulateEvent(mockTimeoutIssuedEntry, mockGuild);
    expect(dummyTarget.timeout).toHaveBeenCalledWith(null);
  });

  it("should allow alpha mods to bypass timeout immunity", async () => {
    mockTimeoutApplicability({ immunity: true, alphaOverride: true });
    await simulateEvent(mockTimeoutIssuedEntry, mockGuild);
    expect(dummyTarget.timeout).not.toHaveBeenCalledWith(null);
  });
});

describe("timeout rate-limiting", () => {
  it("should report the issued timeout to service", async () => {
    await simulateEvent(mockTimeoutIssuedEntry, mockGuild);
    expect(mockedTimeoutService.reportIssued)
      .toHaveBeenCalledWith(dummyExecutor.id);
  });

  it("should undo timeout if executor is rate limited", async () => {
    mockTimeoutApplicability({ rateLimited: true });
    await simulateEvent(mockTimeoutIssuedEntry, mockGuild);
    expect(dummyTarget.timeout).toHaveBeenCalledWith(null);
  });

  it("should time out rate-limited non-alpha executors", async () => {
    mockTimeoutApplicability({ rateLimited: true });
    await simulateEvent(mockTimeoutIssuedEntry, mockGuild);
    expect(dummyExecutor.timeout).toHaveBeenCalledWith(
      60_000, "Spamming timeout.",
    );
  });

  it("should not rate limit alpha mods", async () => {
    mockTimeoutApplicability({ rateLimited: true, alphaOverride: true });
    await simulateEvent(mockTimeoutIssuedEntry, mockGuild);
    expect(dummyTarget.timeout).not.toHaveBeenCalledWith(null);
  });

  it("should not attempt to time alpha mods even if rate limited", async () => {
    mockTimeoutApplicability({ rateLimited: true, alphaOverride: true });
    await simulateEvent(mockTimeoutIssuedEntry, mockGuild);
    expect(dummyExecutor.timeout).not.toHaveBeenCalled();
  });
});

describe("alerting about long timeout", () => {
  const oneWeekMsec = 7 * 24 * 3600 * 1000;

  let mockExtendedTimeoutIssuedEntry: GuildAuditLogsEntry;
  let issuedEmbedMatcher: Matcher<EmbedBuilder>;
  beforeEach(() => {
    const nowMsec = Date.now();
    const extendedUntil = new Date(nowMsec + oneWeekMsec);
    mockExtendedTimeoutIssuedEntry = cloneDeep(mockTimeoutIssuedEntry);
    mockExtendedTimeoutIssuedEntry.changes[0].new = extendedUntil.toISOString();
    addMockGetter(mockExtendedTimeoutIssuedEntry, "createdTimestamp", nowMsec);
    issuedEmbedMatcher = getIssuedEmbedMatcher(extendedUntil);
  });

  it("should send embed to the mod channel", async () => {
    await simulateEvent(mockExtendedTimeoutIssuedEntry, mockGuild);
    expectSentEmbedTo(mockModChannel, issuedEmbedMatcher, true);
  });

  it("should still alert mod channel if alpha mod does it", async () => {
    mockTimeoutApplicability({ alphaOverride: true });
    await simulateEvent(mockExtendedTimeoutIssuedEntry, mockGuild);
    expectSentEmbedTo(mockModChannel, issuedEmbedMatcher, true);
  });

  it("should not alert mod channel if timeout is not long", async () => {
    await simulateEvent(mockTimeoutIssuedEntry, mockGuild);
    expect(mockModChannel.send).not.toHaveBeenCalled();
  });
});
