import { TimeoutService } from "../../src/services/timeout.service";

const dummyNow = new Date(42);
const dummyUntil = new Date(42 + 60 * 1000);
const dummyImmunities = [
  ["1234567890", new Date(42 + 60 * 1000)],
  ["9876543210", new Date(42 + 120 * 1000)],
  ["4242424242", new Date(42 + 100 * 1000)],
  ["4455667788", new Date(0)], // Expired.
] as const;

let timeoutService: TimeoutService;

beforeEach(() => {
  timeoutService = new TimeoutService();
  jest.useFakeTimers();
  jest.setSystemTime(dummyNow);
});

afterEach(() => {
  jest.useRealTimers();
});

describe("timeout immunity management", () => {
  const dummyUid = "123456789";

  it("should grant immunity to a user", async () => {
    timeoutService.grantImmunity(dummyUid, dummyUntil);
    const immune = timeoutService.isImmune(dummyUid);
    expect(immune).toEqual(true);
  });

  it("should revoke immunity from a user", async () => {
    timeoutService.grantImmunity(dummyUid, dummyUntil);
    timeoutService.revokeImmunity(dummyUid);
    const immune = timeoutService.isImmune(dummyUid);
    expect(immune).toEqual(false);
  });

  it("should list immunities", async () => {
    for (const [uid, expiration] of dummyImmunities) {
      timeoutService.grantImmunity(uid, expiration);
    }
    const result = timeoutService.listImmunities();
    const resultEntries = Array.from(result.entries());
    const expectedEntries = dummyImmunities.slice(0, -1);
    expect(resultEntries.sort()).toEqual(expectedEntries.sort());
  });
});
