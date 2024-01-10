jest.mock("../../src/utils/dates.utils");

import { toUnixSeconds } from "../../src/utils/dates.utils";
import {
  TimestampFormat,
  joinUserMentions,
  toBulletedList,
  toChannelMention,
  toRelativeTimestampMention,
  toRoleMention,
  toTimestampMention,
  toUserMention,
} from "../../src/utils/markdown.utils";

const mockedToUnixSeconds = jest.mocked(toUnixSeconds);
const DUMMY_UNIX_TIME = 4242424242;
mockedToUnixSeconds.mockReturnValue(DUMMY_UNIX_TIME);

describe("Discord object mention helpers", () => {
  it("should return a correct role mention", () => {
    const result = toRoleMention("12345");
    expect(result).toEqual("<@&12345>");
  });

  it("should return a correct user mention", () => {
    const result = toUserMention("12345");
    expect(result).toEqual("<@12345>");
  });

  it("should return a correct channel mention", () => {
    const result = toChannelMention("12345");
    expect(result).toEqual("<#12345>");
  });

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
    for (const formatCode of Object.values(TimestampFormat)) {
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
