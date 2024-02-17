import { Collection, Message, inlineCode } from "discord.js";
import { mockDeep } from "jest-mock-extended";

import { BOT_DEV_RID, KAI_RID } from "../../../../src/config";
import devReactSpec from "../../../../src/controllers/dev/control/react.command";
import { RoleLevel } from "../../../../src/middleware/privilege.middleware";
import { MockInteraction } from "../../../test-utils";
import {
  mockChannelFetchMessage,
  mockChannelFetchMessageById,
} from "./dev-control-test-utils";

const dummyMessageId = "123456789";

let mock: MockInteraction;
beforeEach(() => { mock = new MockInteraction(devReactSpec); });

function expectRepliedWithSucceededEmojis(...emojis: string[]): void {
  mock.expectRepliedWith({
    content: expect.stringContaining(`✅ Reacted with ${emojis.join(" ")}`),
    ephemeral: true,
  });
}

it("should require privilege level >= DEV", async () => {
  mock
    .mockCaller({ roleIds: [KAI_RID] })
    .mockOption("String", "emojis", "🥺");
  await mock.simulateCommand();
  expect(mock.interaction.channel!.messages.fetch).not.toHaveBeenCalled();
  mock.expectMentionedMissingPrivilege(RoleLevel.DEV);
});

it("should react to the most recent message", async () => {
  mock
    .mockCaller({ roleIds: [BOT_DEV_RID] })
    .mockOption("String", "emojis", "🤩");
  const mockMessage = mockDeep<Message<true>>();
  mock.interaction.channel!.messages.fetch
    .mockResolvedValueOnce(new Collection([["DUMMY-ID", mockMessage]]));

  await mock.simulateCommand();

  expect(mockMessage.react).toHaveBeenCalledWith("🤩");
  expectRepliedWithSucceededEmojis("🤩");
});

it("should react to the specified message (using ID)", async () => {
  mock
    .mockCaller({ roleIds: [BOT_DEV_RID] })
    .mockOption("String", "emojis", "🫡")
    .mockOption("String", "message", dummyMessageId);
  const mockMessage = mockChannelFetchMessageById(mock, dummyMessageId);

  await mock.simulateCommand();

  expect(mockMessage.react).toHaveBeenCalledWith("🫡");
  expectRepliedWithSucceededEmojis("🫡");
});

it("should react to the specified message (using URL)", async () => {
  const dummyUrl = `https://discord.com/channels/3344/6677/${dummyMessageId}`;
  mock
    .mockCaller({ roleIds: [BOT_DEV_RID] })
    .mockOption("String", "emojis", "😪")
    .mockOption("String", "message", dummyUrl);
  const mockMessage = mockChannelFetchMessageById(mock, dummyMessageId);

  await mock.simulateCommand();

  expect(mockMessage.react).toHaveBeenCalledWith("😪");
  expectRepliedWithSucceededEmojis("😪");
});

describe("caret notation", () => {
  beforeEach(() => {
    mock
      .mockCaller({ roleIds: [BOT_DEV_RID] })
      .mockOption("String", "emojis", "🔥");
  });

  it("should react to the 3rd most recent message (by ^^^)", async () => {
    mock.mockOption("String", "message", "^^^");
    const mockMessage = mockChannelFetchMessage(mock, 3);

    await mock.simulateCommand();

    expect(mockMessage.react).toHaveBeenCalledWith("🔥");
    expectRepliedWithSucceededEmojis("🔥");
  });

  it("should react to the 3rd most recent message (by ^3)", async () => {
    mock.mockOption("String", "message", "^3");
    const mockMessage = mockChannelFetchMessage(mock, 3);

    await mock.simulateCommand();

    expect(mockMessage.react).toHaveBeenCalledWith("🔥");
    expectRepliedWithSucceededEmojis("🔥");
  });
});

describe("error handling", () => {
  it("should reject invalid emojis", async () => {
    mock
      .mockCaller({ roleIds: [BOT_DEV_RID] })
      .mockOption("String", "emojis", "😨");
    const mockMessage = mockChannelFetchMessage(mock);
    mockMessage.react.mockRejectedValueOnce("DUMMY-ERROR");

    await mock.simulateCommand();

    mock.expectRepliedWith({
      content: expect.stringContaining(
        `Failed to react with emojis: ${inlineCode("😨")}.`,
      ),
      ephemeral: true,
    });
  });

  it("should reject invalid message identifiers", async () => {
    mock
      .mockCaller({ roleIds: [BOT_DEV_RID] })
      .mockOption("String", "emojis", "😨")
      .mockOption("String", "message", "lmao");

    await mock.simulateCommand();

    mock.expectRepliedWith({
      content: "`lmao` does not point to a valid message!",
      ephemeral: true,
    });
  });

  it("should reject input strings without any emojis", async () => {
    mock
      .mockCaller({ roleIds: [BOT_DEV_RID] })
      .mockOption("String", "emojis", "lorem ipsum");

    await mock.simulateCommand();

    mock.expectRepliedWith({
      content: expect.stringContaining(
        `No emojis found in your input ${inlineCode("lorem ipsum")}!`,
      ),
      ephemeral: true,
    });
  });
});

describe("multiple emojis at once", () => {
  it("should react with all emojis in the string", async () => {
    mock
      .mockCaller({ roleIds: [BOT_DEV_RID] })
      .mockOption("String", "emojis", "hello 💯 there 🥳!")
      .mockOption("String", "message", dummyMessageId);
    const mockMessage = mockChannelFetchMessageById(mock, dummyMessageId);

    await mock.simulateCommand();

    expect(mockMessage.react).toHaveBeenCalledWith("💯");
    expect(mockMessage.react).toHaveBeenCalledWith("🥳");
    expectRepliedWithSucceededEmojis("💯", "🥳");
  });

  it("should work with both Unicode and custom emojis", async () => {
    const dummyCustomEmoji = "<:customEmoji:4242424242>";
    mock
      .mockCaller({ roleIds: [BOT_DEV_RID] })
      .mockOption("String", "emojis", `general ${dummyCustomEmoji} kenobi 😠!`)
      .mockOption("String", "message", dummyMessageId);
    const mockMessage = mockChannelFetchMessageById(mock, dummyMessageId);

    await mock.simulateCommand();

    expect(mockMessage.react).toHaveBeenCalledWith(dummyCustomEmoji);
    expect(mockMessage.react).toHaveBeenCalledWith("😠");
    expectRepliedWithSucceededEmojis(dummyCustomEmoji, "😠");
  });

  it("should continue reacting even on a failed reaction", async () => {
    mock
      .mockCaller({ roleIds: [BOT_DEV_RID] })
      .mockOption("String", "emojis", "wow ❌ amazing ✅ lol")
      .mockOption("String", "message", dummyMessageId);
    const mockMessage = mockChannelFetchMessageById(mock, dummyMessageId);
    mockMessage.react.mockRejectedValueOnce("DUMMY-ERROR");

    await mock.simulateCommand();

    expect(mockMessage.react).toHaveBeenCalledWith("✅");
    // But as long as any reaction failed, the interaction reply is a failure
    // notification.
    mock.expectRepliedWith({
      content: expect.stringContaining(
        `Failed to react with emojis: ${inlineCode("❌")}.`,
      ),
      ephemeral: true,
    });
  });
});
