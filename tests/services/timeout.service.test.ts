import timeoutService from "../../src/services/timeout.service";
import { addDateSeconds } from "../../src/utils/dates.utils";

describe("timeout immunity management", () => {
  const dummyUid = "123456789";

  it("should grant immunity to a user", async () => {
    const dummyUntil = addDateSeconds(60);
    timeoutService.grantImmunity(dummyUid, dummyUntil);
    const immune = timeoutService.isImmune(dummyUid);
    expect(immune).toEqual(true);
  });

  it("should revoke immunity from a user", async () => {
    const dummyUntil = addDateSeconds(60);
    timeoutService.grantImmunity(dummyUid, dummyUntil);
    timeoutService.revokeImmunity(dummyUid);
    const immune = timeoutService.isImmune(dummyUid);
    expect(immune).toEqual(false);
  });
});
