import { Message } from "discord.js";
import { DeepMockProxy, mockDeep } from "jest-mock-extended";

import { LukeService } from "../../src/services/luke.service";
import { addMockGetter } from "../test-utils";

let lukeService: LukeService;
beforeEach(() => {
  lukeService = new LukeService();
})

describe("meow chance", () => {
  it("should start with the initial meow chance", () => {
    const chance = lukeService.getMeowChance();
    expect(chance).toBeCloseTo(LukeService.INIT_MEOW_CHANCE);
  });

  it("should reflect the updated meow chance", () => {
    lukeService.setMeowChance(0.42);
    const newChance = lukeService.getMeowChance()
    expect(newChance).toBeCloseTo(0.42);
  });
});

describe("dad joke handler", () => {
  // ARRANGE.
  function getMockMessage(content: string): DeepMockProxy<Message> {
    const mockMessage = mockDeep<Message>();
    mockMessage.content = content;
    addMockGetter(mockMessage.member!, "displayName", "test-user");
    addMockGetter(mockMessage.client.user, "displayName", "test-bot-user");
    return mockMessage;
  }

  // ASSERT.
  function expectRepliedWith(
    mockMessage: DeepMockProxy<Message>,
    content: string,
  ): void {
    expect(mockMessage.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content })
    );
  }

  it("should respond with the affirmative Dad joke", async () => {
    const mockMessage = getMockMessage("i am really weird and things");

    const result = await lukeService.processDadJoke(mockMessage);

    expect(result).toEqual(true);
    expectRepliedWith(
      mockMessage,
      "Hi really weird and things, I'm test-bot-user!",
    );
  });

  it("should respond with the negative Dad joke", async () => {
    const mockMessage = getMockMessage("i am not really weird");

    const result = await lukeService.processDadJoke(mockMessage);

    expect(result).toEqual(true);
    expectRepliedWith(
      mockMessage,
      "Of course you're not really weird, you're test-user!",
    );
  });

  it("should respond with the special 'Welcome back' version", async () => {
    const mockMessage = getMockMessage("i am back!");

    const result = await lukeService.processDadJoke(mockMessage);

    expect(result).toEqual(true);
    expectRepliedWith(mockMessage, "Welcome back, test-user!");
  });

  it("should not respond if the trigger is not detected", async () => {
    const mockMessage = getMockMessage("an ordinary message");

    const result = await lukeService.processDadJoke(mockMessage);

    expect(result).toEqual(false);
    expect(mockMessage.reply).not.toHaveBeenCalled();
  });

  it("should trigger even with contractions (w/ punctuation)", async () => {
    const mockMessage = getMockMessage("i'm really weird and things");

    const result = await lukeService.processDadJoke(mockMessage);

    expect(result).toEqual(true);
    expectRepliedWith(
      mockMessage,
      "Hi really weird and things, I'm test-bot-user!",
    );
  });

  it("should trigger even with contractions (w/o punctuation)", async () => {
    const mockMessage = getMockMessage("im really weird and things");

    const result = await lukeService.processDadJoke(mockMessage);

    expect(result).toEqual(true);
    expectRepliedWith(
      mockMessage,
      "Hi really weird and things, I'm test-bot-user!",
    );
  });
});
