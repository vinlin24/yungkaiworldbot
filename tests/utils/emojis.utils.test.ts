import {
  CustomEmoji,
  parseCustomEmojis,
  toEscapedEmoji,
} from "../../src/utils/emojis.utils";

describe("parsing custom emojis", () => {
  it("should return all custom emojis in string", () => {
    const dummy1 = "<:dummy1:123456789>";
    const dummy2 = "<:dummy2:987654321>";
    const content = `i'm a ${dummy1} but you're a ${dummy2}!`;

    const result = parseCustomEmojis(content);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual<CustomEmoji>(expect.objectContaining({
      name: "dummy1",
      id: "123456789",
    }));
    expect(result[1]).toEqual<CustomEmoji>(expect.objectContaining({
      name: "dummy2",
      id: "987654321",
    }));
  });

  it("should support animated emojis", () => {
    const dummy = "<a:dummy3:111222333>";
    const content = `look, ${dummy} moves!`;

    const result = parseCustomEmojis(content);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual<CustomEmoji>(expect.objectContaining({
      name: "dummy3",
      id: "111222333",
      animated: true,
    }));
  });
});

describe("encoding custom emojis", () => {
  it("should return the emoji in proper escaped format", () => {
    const dummy: CustomEmoji = {
      name: "dummy",
      id: "4242424242",
    };

    const result = toEscapedEmoji(dummy);

    expect(result).toEqual(`<:${dummy.name}:${dummy.id}>`);
  });

  it("should support animated emojis", () => {
    const dummy: CustomEmoji = {
      name: "animatedDummy",
      id: "1234567890",
      animated: true,
    };

    const result = toEscapedEmoji(dummy);

    expect(result).toEqual(`<a:${dummy.name}:${dummy.id}>`);
  });
});
