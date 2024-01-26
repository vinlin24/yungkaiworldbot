import {
  Collection,
  GuildTextBasedChannel,
  Message,
  Snowflake,
} from "discord.js";

import { mockDeep } from "jest-mock-extended";
import config from "../../../../src/config";
import devSendSpec from "../../../../src/controllers/dev/control/send.command";
import { RoleLevel } from "../../../../src/middleware/privilege.middleware";
import { MockInteraction } from "../../../test-utils";

let mock: MockInteraction;
beforeEach(() => { mock = new MockInteraction(devSendSpec); });

it("should require privilege level >= DEV", async () => {
  mock
    .mockCaller({ roleIds: [config.KAI_RID] })
    .mockOption("String", "content", "please let me use this");
  await mock.simulateCommand();
  expect(mock.interaction.channel!.send).not.toHaveBeenCalled();
  mock.expectMentionedMissingPrivilege(RoleLevel.DEV);
});

it("should forward content to current channel", async () => {
  mock
    .mockCaller({ roleIds: [config.BOT_DEV_RID] })
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
    .mockCaller({ roleIds: [config.BOT_DEV_RID] })
    .mockOption("String", "content", "general kenobi")
    .mockOption<GuildTextBasedChannel>("Channel", "channel", mockChannel);
  await mock.simulateCommand();
  expect(mockChannel.send).toHaveBeenCalledWith(
    expect.objectContaining({ content: "general kenobi" }),
  );
  mock.expectRepliedGenericACK();
});

it("should disable mentions by default", async () => {
  mock
    .mockCaller({ roleIds: [config.BOT_DEV_RID] })
    .mockOption("String", "content", "you are a bold one");
  await mock.simulateCommand();
  expect(mock.interaction.channel!.send).toHaveBeenCalledWith(
    expect.objectContaining({
      allowedMentions: expect.objectContaining({ parse: [] }),
    }),
  );
  mock.expectRepliedGenericACK();
});

it("should enable mentions if explicitly specified", async () => {
  mock
    .mockCaller({ roleIds: [config.BOT_DEV_RID] })
    .mockOption("String", "content", "you're shorter than i expected")
    .mockOption("Boolean", "enable_mentions", true);
  await mock.simulateCommand();
  expect(mock.interaction.channel!.send).toHaveBeenCalledWith(
    expect.not.objectContaining({
      allowedMentions: expect.anything(),
    }),
  );
  mock.expectRepliedGenericACK();
});

describe("replying to another message", () => {
  const dummyMessageId = "123456789";

  it("should reply to the correct message (using ID)", async () => {
    mock
      .mockCaller({ roleIds: [config.BOT_DEV_RID] })
      .mockOption("String", "content", "jedi scum")
      .mockOption("String", "reference", dummyMessageId);
    const mockMessage = mockDeep<Message<true>>();
    // @ts-expect-error Choose Message overload over Collection return type.
    mock.interaction.channel!.messages.fetch.mockImplementationOnce(id => {
      if (id as Snowflake === dummyMessageId) {
        return Promise.resolve(mockMessage);
      }
      throw new Error("unrecognized dummy message ID");
    });

    await mock.simulateCommand();

    expect(mockMessage.channel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "jedi scum",
        reply: expect.objectContaining({ messageReference: mockMessage }),
      }),
    );
    mock.expectRepliedGenericACK();
  });

  it("should reply to the correct message (using URL)", async () => {
    const dummyUrl = `https://discord.com/channels/3344/6677/${dummyMessageId}`;
    mock
      .mockCaller({ roleIds: [config.BOT_DEV_RID] })
      .mockOption("String", "content", "it's over anakin")
      .mockOption("String", "reference", dummyUrl);
    const mockMessage = mockDeep<Message<true>>();
    // @ts-expect-error Choose Message overload over Collection return type.
    mock.interaction.channel!.messages.fetch.mockImplementationOnce(id => {
      if (id as Snowflake === dummyMessageId) {
        return Promise.resolve(mockMessage);
      }
      throw new Error("unrecognized dummy message ID");
    });

    await mock.simulateCommand();

    expect(mockMessage.channel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "it's over anakin",
        reply: expect.objectContaining({ messageReference: mockMessage }),
      }),
    );
    mock.expectRepliedGenericACK();
  });

  it("should reply to the most recent message in channel", async () => {
    mock
      .mockCaller({ roleIds: [config.BOT_DEV_RID] })
      .mockOption("String", "content", "i have the high ground")
      .mockOption("String", "reference", "^");
    const mockMessage = mockDeep<Message<true>>();
    mock.interaction.channel!.messages.fetch
      .mockResolvedValueOnce(new Collection([["DUMMY-ID", mockMessage]]));

    await mock.simulateCommand();

    expect(mockMessage.channel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "i have the high ground",
        reply: expect.objectContaining({ messageReference: mockMessage }),
      }),
    );
    mock.expectRepliedGenericACK();
  });
});
