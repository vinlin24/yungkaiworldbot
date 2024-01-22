import { TokenBucket } from "../../src/utils/algorithms.utils";

describe("token bucket rate-limiting algorithm", () => {
  describe("constructor error handling", () => {
    it("should reject non-positive rates", () => {
      expect(() => new TokenBucket(0, 10)).toThrow(RangeError);
    });

    it("should reject non-positive capacities", () => {
      expect(() => new TokenBucket(2, 0)).toThrow(RangeError);
    });
  });

  describe("consuming tokens", () => {
    it("should allow consuming tokens within capacity", () => {
      const tokenBucket = new TokenBucket(1, 10);
      expect(tokenBucket.consume()).toEqual(true);
    });

    it("should block consuming tokens beyond capacity", () => {
      const tokenBucket = new TokenBucket(1, 1);
      expect(tokenBucket.consume()).toEqual(true);
      expect(tokenBucket.consume()).toEqual(false);
    });

    it("should refill tokens over time", () => {
      jest.useFakeTimers();

      const tokenBucket = new TokenBucket(1, 1);
      expect(tokenBucket.consume()).toEqual(true);

      jest.advanceTimersByTime(500); // Half a second.
      expect(tokenBucket.consume()).toEqual(true);

      jest.advanceTimersByTime(1000); // One second.
      expect(tokenBucket.consume()).toEqual(true);

      jest.useRealTimers();
    });
  });
});
