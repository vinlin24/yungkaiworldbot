import { Collection, Role } from "discord.js";

import {
  getAllMembers,
  getAllPermute2,
  iterateEnum,
  unorderedEquals,
} from "../../src/utils/iteration.utils";

describe("iterating over an enum", () => {
  enum DummyEnum { A = 0, B, C }

  it("should yield name-value pairs", () => {
    const result = iterateEnum(DummyEnum);
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

describe("getting all permutation pairs from an array", () => {
  it("should get all permutation pairs", () => {
    const result = getAllPermute2([1, 2, 3]);
    const pairs = [
      [1, 2], [1, 3],
      [2, 1], [2, 3],
      [3, 1], [3, 2],
    ];
    expect(result.sort()).toEqual(pairs.sort());
  });
});

describe("testing iterable equality ignoring order", () => {
  it("should treat contents as equal ignoring order", () => {
    const array1 = [1, 2, 3, 4, 5];
    const array2 = [5, 4, 3, 2, 1];
    const result = unorderedEquals(array1, array2);
    expect(result).toEqual(true);
  });

  it("should treat contents as unequal even when ignoring order", () => {
    const array1 = [1, 2, 3, 4, 5];
    const array2 = [2, 3, 4, 5, 6];
    const result = unorderedEquals(array1, array2);
    expect(result).toEqual(false);
  });
});
