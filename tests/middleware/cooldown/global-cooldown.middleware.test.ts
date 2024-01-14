import {
  CooldownSpec,
  GlobalCooldownManager,
} from "../../../src/middleware/cooldown.middleware";
import {
  dummyBypasserUid,
  dummyMessage1,
  dummyMessage1Uid,
  expectGlobalCooldownDump,
  initGlobalCDSpec,
} from "./cooldown-test-utils";

let manager: GlobalCooldownManager;

beforeEach(() => {
  manager = new GlobalCooldownManager(initGlobalCDSpec);
});

it("should know that it's observing a global cooldown type", () => {
  expect(manager.type).toEqual<CooldownSpec["type"]>("global");
});

it("should know its global duration", () => {
  expect(manager.duration).toEqual(initGlobalCDSpec.seconds);
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

it("should dump the expected state", () => expectGlobalCooldownDump(manager));
