jest.mock("../../src/middleware/filters.middleware", () => {
  const actual = jest.requireActual("../../src/middleware/filters.middleware");
  return {
    ...actual,
    // Dependency mock for the filter functions.
    isPollutionImmuneChannel: jest.fn(),
    // But save the real version so we can test it too.
    realIsPollutionImmuneChannel: actual.isPollutionImmuneChannel,
  };
});

import { GuildTextBasedChannel, Message } from "discord.js";

/* eslint-disable import-newlines/enforce */
import {
  channelPollutionAllowed,
  channelPollutionAllowedOrBypass,
  containsCustomEmoji,
  containsEmoji,
  contentMatching,
  ignoreBots,
  isPollutionImmuneChannel,
  messageFrom,
  randomly,
  // @ts-expect-error We injected this.
  realIsPollutionImmuneChannel,
} from "../../src/middleware/filters.middleware";
import { mockRandomReturnValueOnce, restoreRandomSpy } from "../test-utils";

const mockedIsPollutionImmuneChannel = jest.mocked(isPollutionImmuneChannel);

const dummyUid1 = "123456789";
const dummyUid2 = "987654321";

describe("ignoreBots middleware", () => {
  it("should let non-bots pass", () => {
    const message = { author: { bot: false } } as Message;
    const passed = ignoreBots(message);
    expect(passed).toEqual(true);
  });

  it("should not let bots pass", () => {
    const message = { author: { bot: true } } as Message;
    const passed = ignoreBots(message);
    expect(passed).toEqual(false);
  });
});

describe("messageFrom middleware", () => {
  it("should let the specified user pass", () => {
    const message = { author: { id: dummyUid1 } } as Message;
    const passed = messageFrom(dummyUid1)(message);
    expect(passed).toEqual(true);
  });

  it("should not pass if from other user", () => {
    const message = { author: { id: dummyUid2 } } as Message;
    const passed = messageFrom(dummyUid1)(message);
    expect(passed).toEqual(false);
  });

  it("should treat multiple specified users with logical OR", () => {
    const message = { author: { id: dummyUid2 } } as Message;
    const passed = messageFrom(dummyUid1, dummyUid2)(message);
    expect(passed).toEqual(true);
  });
});

describe("channel pollution", () => {
  const IMPORTANT_CHANNELS = [
    "general",
    "introductions",
    "staff-introductions",
    "announcements",
    "welcome",
  ] as const;
  const POLLUTED_CHANNELS = [
    "bot-spam",
  ] as const;

  describe("immunity policy", () => {
    it("should treat import channels as pollution-immune", () => {
      for (const channelName of IMPORTANT_CHANNELS) {
        const channel = { name: channelName } as GuildTextBasedChannel;
        const isImmune = realIsPollutionImmuneChannel(channel);
        expect(isImmune).toEqual(true);
      }
    });

    it("should treat other channels as pollution-allowed", () => {
      for (const channelName of POLLUTED_CHANNELS) {
        const channel = { name: channelName } as GuildTextBasedChannel;
        const isImmune = realIsPollutionImmuneChannel(channel);
        expect(isImmune).toEqual(false);
      }
    });
  });

  describe("channelPollutionAllowed middleware", () => {
    it("should pass based on immunity policy", () => {
      for (const channelName of [...IMPORTANT_CHANNELS, ...POLLUTED_CHANNELS]) {
        const channel = { name: channelName } as GuildTextBasedChannel;
        const isImmune = realIsPollutionImmuneChannel(channel);
        mockedIsPollutionImmuneChannel.mockReturnValueOnce(isImmune);

        const message = { channel } as Message;
        const passed = channelPollutionAllowed(message);
        expect(passed).toEqual(!isImmune);
      }
    });
  });

  describe("channelPollutionAllowedOrBypass middleware", () => {
    const closure = channelPollutionAllowedOrBypass(dummyUid1);

    it("should pass based on immunity policy", () => {
      for (const channelName of [...IMPORTANT_CHANNELS, ...POLLUTED_CHANNELS]) {
        const channel = { name: channelName } as GuildTextBasedChannel;
        const isImmune = realIsPollutionImmuneChannel(channel);
        mockedIsPollutionImmuneChannel.mockReturnValueOnce(isImmune);

        const message = { channel, author: { id: dummyUid2 } } as Message;
        const passed = closure(message);
        expect(passed).toEqual(!isImmune);
      }
    });

    it("should pass if bypass even if channel is pollution-immune", () => {
      for (const channelName of IMPORTANT_CHANNELS) {
        const channel = { name: channelName } as GuildTextBasedChannel;
        const message = { channel, author: { id: dummyUid1 } } as Message;
        const passed = closure(message);
        expect(passed).toEqual(true);
      }
    });
  });
});

describe("contentMatching middleware", () => {
  const closure = contentMatching(/^ab+c$/i);

  it("should pass if content matches", () => {
    const message = { content: "abbbc" } as Message;
    const passed = closure(message);
    expect(passed).toEqual(true);
  });

  it("shouldn't pass if content doesn't match", () => {
    const message = { content: " abbbc " } as Message;
    const passed = closure(message);
    expect(passed).toEqual(false);
  });
});

describe("randomly middleware", () => {
  const message = {} as Message;

  afterEach(restoreRandomSpy);

  describe("using a constant success chance", () => {
    const closure = randomly(0.42);

    it("should pass", async () => {
      mockRandomReturnValueOnce(0.05);
      const passed = await closure(message);
      expect(passed).toEqual(true);
    });

    it("should not pass", async () => {
      mockRandomReturnValueOnce(0.95);
      const passed = await closure(message);
      expect(passed).toEqual(false);
    });
  });

  describe("using a dynamic success chance", () => {
    const dynamicSuccessChance = jest.fn();
    const closure = randomly(dynamicSuccessChance);

    it("should pass with callback returning 0.5", async () => {
      dynamicSuccessChance.mockReturnValueOnce(0.5);
      mockRandomReturnValueOnce(0.05);
      const passed = await closure(message);
      expect(passed).toEqual(true);
    });

    it("should pass with callback returning 0.01", async () => {
      dynamicSuccessChance.mockReturnValueOnce(0.01);
      mockRandomReturnValueOnce(0.05);
      const passed = await closure(message);
      expect(passed).toEqual(false);
    });
  });
});

describe("checking for emojis", () => {
  describe("custom emojis", () => {
    const dummyEmojiId = "4242424242";

    it("should pass with custom emoji in content", () => {
      const content = `hello <:dummy:${dummyEmojiId}>!`;
      const closure = containsCustomEmoji(dummyEmojiId);
      const message = { content } as Message;
      const passed = closure(message);
      expect(passed).toEqual(true);
    });

    it("shouldn't pass with no custom emoji in content", () => {
      const closure = containsCustomEmoji(dummyEmojiId);
      const message = { content: "hello there" } as Message;
      const passed = closure(message);
      expect(passed).toEqual(false);
    });
  });

  describe("Unicode emojis", () => {
    it("should pass with Unicode emoji in content", () => {
      const closure = containsEmoji("👋");
      const message = { content: "hello 👋 :)" } as Message;
      const passed = closure(message);
      expect(passed).toEqual(true);
    });

    it("shouldn't pass with no Unicode emoji in content", () => {
      const closure = containsEmoji("👋");
      const message = { content: "hello 🫡 :)" } as Message;
      const passed = closure(message);
      expect(passed).toEqual(false);
    });
  });
});
