import { CustomEmoji, parseCustomEmojis, toEscapedEmoji } from "../../src/utils/emojis.utils";

describe("parsing custom emojis", () => {
  it("should return all custom emojis in string", () => {
    const dummy1 = "<:dummy1:123456789>";
    const dummy2 = "<:dummy2:987654321>";
    const content = `i'm a ${dummy1} but you're a ${dummy2}!`;

    const result = parseCustomEmojis(content);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual<CustomEmoji>({
      name: "dummy1",
      id: "123456789",
    });
    expect(result[1]).toEqual<CustomEmoji>({
      name: "dummy2",
      id: "987654321",
    });
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
});
