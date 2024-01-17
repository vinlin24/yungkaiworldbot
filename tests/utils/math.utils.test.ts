import { randRange } from "../../src/utils/math.utils";
import { spyOnRandom } from "../test-utils";

describe("generating a random integer within a range", () => {
  beforeEach(() => {
    spyOnRandom().mockReturnValue(0.50);
  });

  it("should reject lower bounds that aren't integers", () => {
    expect(() => randRange(1.5, 6)).toThrow();
  });

  it("should reject upper bounds that aren't integers", () => {
    expect(() => randRange(3, 4.5)).toThrow();
  });

  it("should reject lower bounds greater than upper bounds", () => {
    expect(() => randRange(7, 2)).toThrow();
  });

  it("should return the correct number", () => {
    const result = randRange(2, 6);
    expect(result).toEqual(4);
  });

  it("should work even with negative numbers", () => {
    const result = randRange(-10, -3);
    expect(result).toEqual(-6);
  });
});
