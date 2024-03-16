import { GuildTextBasedChannel, Message, MessageFlags } from "discord.js";
import { DeepMockProxy } from "jest-mock-extended";

import { BOT_DEV_RID, KAI_RID } from "../../../../src/config";
import devSendSpec from "../../../../src/controllers/dev/control/send.command";
import { RoleLevel } from "../../../../src/middleware/privilege.middleware";
import { MockInteraction } from "../../../test-utils";
import {
  mockChannelFetchMessage,
  mockChannelFetchMessageById,
} from "./dev-control-test-utils";

let mock: MockInteraction;
beforeEach(() => { mock = new MockInteraction(devSendSpec); });

it("should require privilege level >= DEV", async () => {
  mock
    .mockCaller({ roleIds: [KAI_RID] })
    .mockOption("String", "content", "please let me use this");
  await mock.simulateCommand();
  expect(mock.interaction.channel!.send).not.toHaveBeenCalled();
  mock.expectMentionedMissingPrivilege(RoleLevel.DEV);
});

it("should forward content to current channel", async () => {
  mock
    .mockCaller({ roleIds: [BOT_DEV_RID] })
    .mockOption("String", "content", "hello there");
  await mock.simulateCommand();
  expect(mock.interaction.channel!.send).toHaveBeenCalledWith(
    expect.objectContaining({ content: "hello there" }),
  );
  mock.expectRepliedGenericACK();
});

it("should forward content to specified channel", async () => {
  const mockChannel = { send: jest.fn() } as unknown as GuildTextBasedChannel;
  mock
    .mockCaller({ roleIds: [BOT_DEV_RID] })
    .mockOption("String", "content", "general kenobi")
    .mockOption<GuildTextBasedChannel>("Channel", "channel", mockChannel);
  await mock.simulateCommand();
  expect(mockChannel.send).toHaveBeenCalledWith(
    expect.objectContaining({ content: "general kenobi" }),
  );
  mock.expectRepliedGenericACK();
});

it("should enable mentions by default", async () => {
  mock
    .mockCaller({ roleIds: [BOT_DEV_RID] })
    .mockOption("String", "content", "you are a bold one");
  await mock.simulateCommand();
  expect(mock.interaction.channel!.send).toHaveBeenCalledWith(
    expect.not.objectContaining({
      allowedMentions: expect.anything(),
      flags: MessageFlags.SuppressNotifications,
    }),
  );
  mock.expectRepliedGenericACK();
});

it("should disable mentions if explicitly specified", async () => {
  mock
    .mockCaller({ roleIds: [BOT_DEV_RID] })
    .mockOption("String", "content", "you're shorter than i expected")
    .mockOption("Boolean", "silent", true);
  await mock.simulateCommand();
  expect(mock.interaction.channel!.send).toHaveBeenCalledWith(
    expect.objectContaining({
      allowedMentions: expect.objectContaining({ parse: [] }),
      flags: MessageFlags.SuppressNotifications,
    }),
  );
  mock.expectRepliedGenericACK();
});

describe("replying to another message", () => {
  const dummyMessageId = "123456789";

  function expectRepliedWithReference(
    mockMessage: DeepMockProxy<Message<true>>,
    content: string,
  ): void {
    expect(mockMessage.channel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        content,
        reply: expect.objectContaining({ messageReference: mockMessage }),
      }),
    );
  }

  it("should reply to the correct message (using ID)", async () => {
    mock
      .mockCaller({ roleIds: [BOT_DEV_RID] })
      .mockOption("String", "content", "jedi scum")
      .mockOption("String", "reference", dummyMessageId);
    const mockMessage = mockChannelFetchMessageById(mock, dummyMessageId);

    await mock.simulateCommand();

    expectRepliedWithReference(mockMessage, "jedi scum");
    mock.expectRepliedGenericACK();
  });

  it("should reply to the correct message (using URL)", async () => {
    const dummyUrl = `https://discord.com/channels/3344/6677/${dummyMessageId}`;
    mock
      .mockCaller({ roleIds: [BOT_DEV_RID] })
      .mockOption("String", "content", "it's over anakin")
      .mockOption("String", "reference", dummyUrl);
    const mockMessage = mockChannelFetchMessageById(mock, dummyMessageId);

    await mock.simulateCommand();

    expectRepliedWithReference(mockMessage, "it's over anakin");
    mock.expectRepliedGenericACK();
  });

  describe("caret notation", () => {
    beforeEach(() => {
      mock
        .mockCaller({ roleIds: [BOT_DEV_RID] })
        .mockOption("String", "content", "i have the high ground");
    });

    it("should reply to the most recent message in channel", async () => {
      mock.mockOption("String", "reference", "^");
      const mockMessage = mockChannelFetchMessage(mock);

      await mock.simulateCommand();

      expectRepliedWithReference(mockMessage, "i have the high ground");
      mock.expectRepliedGenericACK();
    });

    it("should reply to the 3rd most recent message (by ^^^)", async () => {
      mock.mockOption("String", "reference", "^^^");
      const mockMessage = mockChannelFetchMessage(mock, 3);

      await mock.simulateCommand();

      expectRepliedWithReference(mockMessage, "i have the high ground");
      mock.expectRepliedGenericACK();
    });

    it("should reply to the 3rd most recent message (by ~3)", async () => {
      mock.mockOption("String", "reference", "~3");
      const mockMessage = mockChannelFetchMessage(mock, 3);

      await mock.simulateCommand();

      expectRepliedWithReference(mockMessage, "i have the high ground");
      mock.expectRepliedGenericACK();
    });
  });

  it("should reject invalid message identifiers", async () => {
    mock
      .mockCaller({ roleIds: [BOT_DEV_RID] })
      .mockOption("String", "content", "you underestimate my power")
      .mockOption("String", "reference", "don't try it");

    await mock.simulateCommand();

    mock.expectRepliedWith({
      content: "`don't try it` does not point to a valid message!",
      ephemeral: true,
    });
  });
});
