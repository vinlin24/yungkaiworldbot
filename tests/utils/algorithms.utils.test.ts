import {
  PerIDSpamTracker,
  TokenBucket,
} from "../../src/utils/algorithms.utils";

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

describe("per-ID spam tracking", () => {
  let spamTracker: PerIDSpamTracker<1, 5>;
  const dummyId1 = "123456789";
  const dummyId2 = "987654321";

  beforeEach(() => {
    spamTracker = new PerIDSpamTracker(1, 5);
    jest.useFakeTimers();
  });

  it("reports events within the rate limit", () => {
    for (let i = 0; i < 5; i++) {
      expect(spamTracker.reportEvent(dummyId1)).toEqual(true);
    }
  });

  it("reports events exceeding the rate limit", () => {
    for (let i = 0; i < 5; i++) {
      expect(spamTracker.reportEvent(dummyId1)).toEqual(true);
    }

    // Sixth event within 1 second should exceed the rate limit.
    expect(spamTracker.reportEvent(dummyId1)).toEqual(false);
  });

  it("handles multiple IDs independently", () => {
    for (let i = 0; i < 5; i++) {
      expect(spamTracker.reportEvent(dummyId1)).toEqual(true);
    }
    for (let i = 0; i < 3; i++) {
      expect(spamTracker.reportEvent(dummyId2)).toEqual(true);
    }

    // Exceed rate limit for user1.
    expect(spamTracker.reportEvent(dummyId1)).toEqual(false);
    // Still within rate limit for user2.
    expect(spamTracker.reportEvent(dummyId2)).toEqual(true);
  });

  it("resets the rate limit for each second", () => {
    for (let i = 0; i < 5; i++) {
      expect(spamTracker.reportEvent(dummyId1)).toEqual(true);
    }

    // Wait for more than 1 second.
    jest.advanceTimersByTime(1500);

    // Events within the new second should not be restricted.
    expect(spamTracker.reportEvent(dummyId1)).toEqual(true);
  });

  it("handles multiple seconds independently", () => {
    for (let i = 0; i < 5; i++) {
      expect(spamTracker.reportEvent(dummyId1)).toEqual(true);
    }

    // Wait for more than 1 second.
    jest.advanceTimersByTime(1500);

    // Events within the new second should not be restricted.
    expect(spamTracker.reportEvent(dummyId1)).toEqual(true);

    // Wait for more than 1 second again.
    jest.advanceTimersByTime(1500);

    // Events within the new second should not be restricted.
    expect(spamTracker.reportEvent(dummyId1)).toEqual(true);
  });

  afterAll(jest.useRealTimers);
});
