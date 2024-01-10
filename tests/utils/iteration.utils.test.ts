import { Collection, Role } from "discord.js";
import { getAllMembers, iterateEnum } from "../../src/utils/iteration.utils";

describe.skip("iterating over an enum", () => {
  enum DummyEnum { A = 0, B, C }

  it("should yield name-value pairs", () => {
    const result = iterateEnum(DummyEnum);
    // TODO: the order within each 2-tuple seems to be flipped as well!
    expect(result).toEqual([
      ["A", 0],
      ["B", 1],
      ["C", 2],
    ]);
  });
});

describe("resolving a mentionable to members", () => {
  // NOTE: Can't really test the case with a lone member since `instanceof
  // GuildMember` is used, and GuildMember's constructor is private :/

  it("should resolve a role into members", () => {
    const mockRole = {
      members: new Collection([["m1", "dummy1"], ["m2", "dummy2"]]),
    } as unknown as Role;
    const result = getAllMembers(mockRole);
    expect(result).toEqual(["dummy1", "dummy2"]);
  });
});
