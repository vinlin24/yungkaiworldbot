jest.mock("../../src/utils/logging.utils");

import { Message, MessageFlags, MessageReplyOptions } from "discord.js";
import { replySilently, replySilentlyWith } from "../../src/utils/interaction.utils";

const mockMessage = {
  reply: jest.fn(),
} as unknown as Message;

describe("replying silently to a message", () => {
  it("should disable all mentions", async () => {
    await replySilently(mockMessage, "hello there");
    expect(mockMessage.reply).toHaveBeenCalledWith(
      expect.objectContaining<MessageReplyOptions>({
        allowedMentions: expect.objectContaining({ parse: [] }),
      }),
    );
  });

  it("should suppress notifications", async () => {
    await replySilently(mockMessage, "hello there");
    expect(mockMessage.reply).toHaveBeenCalledWith(
      expect.objectContaining<MessageReplyOptions>({
        flags: MessageFlags.SuppressNotifications,
      }),
    );
  });
});

describe("replying silently (as a callback)", () => {
  it("should return a closure equivalent to replySilently", async () => {
    const closure = replySilentlyWith("hello there");

    await closure(mockMessage);

    expect(mockMessage.reply).toHaveBeenCalledWith(
      expect.objectContaining<MessageReplyOptions>({
        allowedMentions: expect.objectContaining({ parse: [] }),
        flags: MessageFlags.SuppressNotifications,
      }),
    );
  });
});
