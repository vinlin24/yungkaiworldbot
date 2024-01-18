jest.mock("../../src/utils/dates.utils");

import { TimestampStyles } from "discord.js";
import { toUnixSeconds } from "../../src/utils/dates.utils";
import {
  Mentionable,
  joinUserMentions,
  parseMention,
  toBulletedList,
  toRelativeTimestampMention,
  toTimestampMention,
} from "../../src/utils/markdown.utils";

const mockedToUnixSeconds = jest.mocked(toUnixSeconds);
const DUMMY_UNIX_TIME = 4242424242;
mockedToUnixSeconds.mockReturnValue(DUMMY_UNIX_TIME);

describe("Discord object mention helpers", () => {
  it("should join user mentions", () => {
    const result = joinUserMentions(["123", "456", "789"]);
    expect(result).toEqual("<@123>, <@456>, <@789>");
  });
});

describe("Discord timestamp helpers", () => {
  it("should use the correct timestamp if format is omitted", () => {
    const result = toTimestampMention(new Date());
    expect(result).toEqual(`<t:${DUMMY_UNIX_TIME}>`);
  });

  it("should use the correct timestamp format if specified", () => {
    for (const formatCode of Object.values(TimestampStyles)) {
      const result = toTimestampMention(new Date(), formatCode);
      expect(result).toEqual(`<t:${DUMMY_UNIX_TIME}:${formatCode}>`);
    }
  });

  it("should use the relative timestamp format", () => {
    const result = toRelativeTimestampMention(new Date());
    expect(result).toEqual(`<t:${DUMMY_UNIX_TIME}:R>`);
  });
});

describe("other Markdown utilities", () => {
  it("should return a bulleted list", () => {
    const result = toBulletedList(["line1", "line2", "line3"]);
    expect(result).toMatch(/^[*-] line1\n[*-] line2\n[*-] line3$/);
  });

  it("should return a bullet list with indentation", () => {
    const result = toBulletedList(["line1", "line2", "line3"], 2);
    expect(result).toMatch(/^ {4}[*-] line1\n {4}[*-] line2\n {4}[*-] line3$/);
  });
});

describe("parsing mentionables", () => {
  it("should parse a channel mention", () => {
    const dummyCid = "123456789";
    const mention = `<#${dummyCid}>`;
    const result = parseMention(mention);
    expect(result).toEqual<Mentionable>({ type: "channel", cid: dummyCid });
  });

  it("should parse a role mention", () => {
    const dummyRid = "987654321";
    const mention = `<@&${dummyRid}>`;
    const result = parseMention(mention);
    expect(result).toEqual<Mentionable>({ type: "role", rid: dummyRid });
  });

  it("should parse a user mention without nickname", () => {
    const dummyUid = "224466880";
    const mention = `<@${dummyUid}>`;
    const result = parseMention(mention);
    expect(result).toEqual<Mentionable>({ type: "user", uid: dummyUid });
  });

  it("should parse a user mention with nickname", () => {
    const dummyUid = "224466880";
    const mention = `<@!${dummyUid}>`;
    const result = parseMention(mention);
    expect(result).toEqual<Mentionable>({ type: "user", uid: dummyUid });
  });

  describe("returning null on invalid mentions", () => {
    it("should reject non-mention format", () => {
      const result = parseMention("lorem ispum");
      expect(result).toEqual(null);
    });

    const nonIntegerIDTests = [
      ["un-nicked user", "<@hellothere>"],
      ["nicked user", "<@!42.45077>"],
      ["role", "<@&1234kenobi5>"],
      ["channel", "<#>"],
    ] as const;

    for (const [type, mention] of nonIntegerIDTests) {
      it(`should reject non-integer ${type} IDs`, () => {
        const result = parseMention(mention);
        expect(result).toEqual(null);
      });
    }
  });
});
