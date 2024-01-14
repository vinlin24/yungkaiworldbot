import {
  CooldownSpec,
  PerUserCooldownManager,
} from "../../../src/middleware/cooldown.middleware";
import {
  dummyBypasserUid,
  dummyMessage1,
  dummyMessage1Uid,
  dummyMessage2,
  expectUserCooldownDump,
  initUserCDSpec,
} from "./cooldown-test-utils";

let manager: PerUserCooldownManager;

beforeEach(() => {
  manager = new PerUserCooldownManager(initUserCDSpec);
});

it("should know that it's observing a user cooldown type", () => {
  expect(manager.type).toEqual<CooldownSpec["type"]>("user");
});

it("should know its default duration", () => {
  expect(manager.duration).toEqual(initUserCDSpec.defaultSeconds);
});

it("should clear cooldowns", () => {
  manager.refresh(dummyMessage1);
  const isActiveBefore = manager.isActive(dummyMessage1);
  manager.clearCooldowns();
  const isActiveAfter = manager.isActive(dummyMessage1);
  expect(isActiveAfter).toEqual(false);
  expect(isActiveBefore).toEqual(true);
});

it("should start with the specified bypassers", () => {
  const bypassers = manager.getBypassers();
  expect(bypassers).toEqual([dummyBypasserUid]);
});

it("should support adding bypassers", () => {
  manager.setBypass(true, dummyMessage1Uid);
  const bypassers = manager.getBypassers();
  expect(bypassers).toContain(dummyMessage1Uid);

  manager.refresh(dummyMessage1);
  const isActive = manager.isActive(dummyMessage1);
  expect(isActive).toEqual(false);
});

it("should allow revocation of bypass", () => {
  manager.setBypass(false, dummyMessage1Uid);
  const bypassers = manager.getBypassers();
  expect(bypassers).not.toContain(dummyMessage1Uid);

  manager.refresh(dummyMessage1);
  const isActive = manager.isActive(dummyMessage1);
  expect(isActive).toEqual(true);
});

it("should observe new cooldown duration", () => {
  manager.setDuration(300);
  expect(manager.duration).toEqual(300);
});

it("should have independent cooldowns for different users", () => {
  manager.refresh(dummyMessage1);
  const isActive1 = manager.isActive(dummyMessage1);
  const isActive2 = manager.isActive(dummyMessage2);
  expect(isActive2).toEqual(false);
  // If this isn't true, the prior assertion means nothing.
  expect(isActive1).toEqual(true);
});

it("should dump the expected state", () => expectUserCooldownDump(manager));

it("should support adding overrides", () => {
  manager.setDuration(100, dummyMessage1Uid);
  const state = manager.dump();
  expect(Array.from(state.overrides)).toContainEqual([dummyMessage1Uid, 100]);
});
