import { Collection, Message } from "discord.js";
import { mockDeep } from "jest-mock-extended";

import config from "../../../../src/config";
import devReactSpec from "../../../../src/controllers/dev/control/react.command";
import { RoleLevel } from "../../../../src/middleware/privilege.middleware";
import { MockInteraction } from "../../../test-utils";
import {
  mockChannelFetchMessage,
  mockChannelFetchMessageById,
} from "./dev-control-test-utils";

let mock: MockInteraction;
beforeEach(() => { mock = new MockInteraction(devReactSpec); });

it("should require privilege level >= DEV", async () => {
  mock
    .mockCaller({ roleIds: [config.KAI_RID] })
    .mockOption("String", "emoji", "🥺");
  await mock.simulateCommand();
  expect(mock.interaction.channel!.messages.fetch).not.toHaveBeenCalled();
  mock.expectMentionedMissingPrivilege(RoleLevel.DEV);
});

it("should react to the most recent message", async () => {
  mock
    .mockCaller({ roleIds: [config.BOT_DEV_RID] })
    .mockOption("String", "emoji", "🤩");
  const mockMessage = mockDeep<Message<true>>();
  mock.interaction.channel!.messages.fetch
    .mockResolvedValueOnce(new Collection([["DUMMY-ID", mockMessage]]));

  await mock.simulateCommand();

  expect(mockMessage.react).toHaveBeenCalledWith("🤩");
  mock.expectRepliedGenericACK();
});

it("should react to the specified message (using ID)", async () => {
  const dummyMessageId = "123456789";
  mock
    .mockCaller({ roleIds: [config.BOT_DEV_RID] })
    .mockOption("String", "emoji", "🫡")
    .mockOption("String", "message", dummyMessageId);
  const mockMessage = mockChannelFetchMessageById(mock, dummyMessageId);

  await mock.simulateCommand();

  expect(mockMessage.react).toHaveBeenCalledWith("🫡");
  mock.expectRepliedGenericACK();
});

it("should react to the specified message (using URL)", async () => {
  const dummyMessageId = "123456789";
  const dummyUrl = `https://discord.com/channels/3344/6677/${dummyMessageId}`;
  mock
    .mockCaller({ roleIds: [config.BOT_DEV_RID] })
    .mockOption("String", "emoji", "😪")
    .mockOption("String", "message", dummyUrl);
  const mockMessage = mockChannelFetchMessageById(mock, dummyMessageId);

  await mock.simulateCommand();

  expect(mockMessage.react).toHaveBeenCalledWith("😪");
  mock.expectRepliedGenericACK();
});

describe("error handling", () => {
  it("should reject invalid emojis", async () => {
    mock
      .mockCaller({ roleIds: [config.BOT_DEV_RID] })
      .mockOption("String", "emoji", "😨");
    const mockMessage = mockChannelFetchMessage(mock);
    mockMessage.react.mockRejectedValueOnce("DUMMY-ERROR");

    await mock.simulateCommand();

    mock.expectRepliedWith({
      content: expect.stringContaining("Failed to react with `😨`"),
      ephemeral: true,
    });
  });

  it("should reject invalid message identifiers", async () => {
    mock
      .mockCaller({ roleIds: [config.BOT_DEV_RID] })
      .mockOption("String", "emoji", "😨")
      .mockOption("String", "message", "lmao");

    await mock.simulateCommand();

    mock.expectRepliedWith({
      content: "`lmao` does not point to a valid message!",
      ephemeral: true,
    });
  });
});
