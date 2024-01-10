import { Message } from "discord.js";
import { DeepMockProxy, mockDeep } from "jest-mock-extended";
import { CxtieService, SLAY_EMOJI_ID, SUP_EMOJI_ID } from "../../src/services/cxtie.service";
import { CustomEmoji, toEscapedEmoji } from "../../src/utils/emojis.utils";

let cxtieService: CxtieService;
beforeEach(() => {
  cxtieService = new CxtieService();
});

describe("react chance", () => {
  it("should start with the initial react chance", () => {
    const chance = cxtieService.reactChance;
    expect(chance).toBeCloseTo(CxtieService.INIT_TIMER_REACT_CHANCE);
  });

  it("should reflect the updated react chance", () => {
    cxtieService.reactChance = 0.42;
    const newChance = cxtieService.reactChance;
    expect(newChance).toBeCloseTo(0.42);
  });
});

describe("cringe emoji detection", () => {
  function getMockMessage(content: string): DeepMockProxy<Message> {
    const mockMessage = mockDeep<Message>();
    mockMessage.content = content;
    return mockMessage;
  }

  it("should detect the sup emoji", () => {
    const sup: CustomEmoji = { id: SUP_EMOJI_ID, name: "sup" };
    const mockMessage = getMockMessage(toEscapedEmoji(sup));

    const result = cxtieService.containsCringeEmojis(mockMessage);

    expect(result).toEqual(true);
  });

  it("should detect the slay emoji", () => {
    const slay: CustomEmoji = { id: SLAY_EMOJI_ID, name: "slay" };
    const mockMessage = getMockMessage(toEscapedEmoji(slay));

    const result = cxtieService.containsCringeEmojis(mockMessage);

    expect(result).toEqual(true);
  });

  it("should return false if neither emoji is present", () => {
    const mockMessage = getMockMessage("an ordinary message");

    const result = cxtieService.containsCringeEmojis(mockMessage);

    expect(result).toEqual(false);
  });
});
