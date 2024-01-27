jest.mock("../../../src/services/mention-spam.service");

import {
  EmbedBuilder,
  GuildMember,
  MessageFlags,
  userMention,
} from "discord.js";

import { Matcher } from "jest-mock-extended";
import mentionSpamSpec from "../../../src/controllers/moderation/mention-spam.listener";
import mentionSpamService from "../../../src/services/mention-spam.service";
import { MockMessage } from "../../test-utils";

const mockedMentionSpamService = jest.mocked(mentionSpamService);

let mock: MockMessage;

const dummyAuthorId = "DUMMY-AUTHOR";

const mockTarget1 = {
  id: "DUMMY-TARGET-1",
  timeout: jest.fn(),
  user: {
    username: "dummytarget1",
  },
} as unknown as GuildMember;

const mockTarget2 = {
  id: "DUMMY-TARGET-2",
  timeout: jest.fn(),
  user: {
    username: "dummytarget2",
  },
} as unknown as GuildMember;

beforeEach(() => {
  jest.resetAllMocks(); // TODO: Automate this with resetMocks config.
  mock = new MockMessage(mentionSpamSpec).mockAuthor({ uid: dummyAuthorId });
  // Default to true. Took too long fixing a bug where I needed to explicitly
  // mock the return value or a falsy undefined would have been used.
  mockedMentionSpamService.mentioned.mockReturnValue(true);
});

function mockMemberMentions(...members: GuildMember[]): void {
  mock.message.mentions.members!.values.mockReturnValue(members.values());
}

function mockRateLimited(...members: GuildMember[]): void {
  const uids = members.map(member => member.id);
  mockedMentionSpamService.mentioned.mockImplementation(
    (_, mentionedId) => !uids.includes(mentionedId),
  );
}

function expectAuthorTimedOut(): void {
  expect(mock.message.member!.timeout).toHaveBeenCalledWith(
    expect.any(Number), // Duration.
    expect.any(String), // Reason.
  );
}

it("should call service for each mention in the message", async () => {
  mockMemberMentions(mockTarget1, mockTarget2);

  await mock.simulateEvent();

  expect(mockedMentionSpamService.mentioned)
    .toHaveBeenCalledWith(dummyAuthorId, mockTarget1.id);
  expect(mockedMentionSpamService.mentioned)
    .toHaveBeenCalledWith(dummyAuthorId, mockTarget2.id);
});

it("should time out author for mention spamming", async () => {
  mockMemberMentions(mockTarget1);
  mockRateLimited(mockTarget1);

  await mock.simulateEvent();

  expectAuthorTimedOut();
});

it("should not time out author if within rate limit", async () => {
  mockMemberMentions(mockTarget1);

  await mock.simulateEvent();

  expect(mock.message.member!.timeout).not.toHaveBeenCalled();
});

it("should reply to offending message with embed", async () => {
  mockMemberMentions(mockTarget1);
  mockRateLimited(mockTarget1);

  await mock.simulateEvent();

  const embedMatcher = new Matcher<EmbedBuilder>(embed => {
    const mention = userMention(mockTarget1.id);
    return embed.data.description === `Stop spam mentioning ${mention}.`;
  }, "embed matcher");
  expect(mock.message.reply).toHaveBeenCalledWith(expect.objectContaining({
    embeds: [embedMatcher],
    flags: MessageFlags.SuppressNotifications,
  }));
});

it("should count mentions for different targets independently", async () => {
  mockMemberMentions(mockTarget1, mockTarget2);
  mockRateLimited(mockTarget2);

  await mock.simulateEvent();

  expectAuthorTimedOut();
});

it("should still time out if embed sending fails", async () => {
  mockMemberMentions(mockTarget1);
  mockRateLimited(mockTarget1);
  mock.message.reply.mockRejectedValueOnce("DUMMY-ERROR");

  await mock.simulateEvent();

  expectAuthorTimedOut();
});
