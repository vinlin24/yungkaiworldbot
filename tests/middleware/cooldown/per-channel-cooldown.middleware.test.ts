import {
  CooldownSpec,
  PerChannelCooldownManager,
} from "../../../src/middleware/cooldown.middleware";
import {
  dummyBypasserCid,
  dummyMessage1,
  dummyMessage1Cid,
  dummyMessage2,
  expectChannelCooldownDump,
  initChannelCDSpec,
} from "./cooldown-test-utils";

let manager: PerChannelCooldownManager;

beforeEach(() => {
  manager = new PerChannelCooldownManager(initChannelCDSpec);
});

// TODO: These are literally identical to per-user cooldown tests but with
// slightly renamed variables and descriptions.

it("should know that it's observing a channel cooldown type", () => {
  expect(manager.type).toEqual<CooldownSpec["type"]>("channel");
});

it("should know its default duration", () => {
  expect(manager.duration).toEqual(initChannelCDSpec.defaultSeconds);
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
  expect(bypassers).toEqual([dummyBypasserCid]);
});

it("should support adding bypassers", () => {
  manager.setBypass(true, dummyMessage1Cid);
  const bypassers = manager.getBypassers();
  expect(bypassers).toContain(dummyMessage1Cid);

  manager.refresh(dummyMessage1);
  const isActive = manager.isActive(dummyMessage1);
  expect(isActive).toEqual(false);
});

it("should allow revocation of bypass", () => {
  manager.setBypass(false, dummyMessage1Cid);
  const bypassers = manager.getBypassers();
  expect(bypassers).not.toContain(dummyMessage1Cid);

  manager.refresh(dummyMessage1);
  const isActive = manager.isActive(dummyMessage1);
  expect(isActive).toEqual(true);
});

it("should observe new cooldown duration", () => {
  manager.setDuration(300);
  expect(manager.duration).toEqual(300);
});

it("should have independent cooldowns for different channels", () => {
  manager.refresh(dummyMessage1);
  const isActive1 = manager.isActive(dummyMessage1);
  const isActive2 = manager.isActive(dummyMessage2);
  expect(isActive2).toEqual(false);
  // If this isn't true, the prior assertion means nothing.
  expect(isActive1).toEqual(true);
});

it("should dump the expected state", () => expectChannelCooldownDump(manager));

it("should support adding overrides", () => {
  manager.setDuration(100, dummyMessage1Cid);
  const state = manager.dump();
  expect(Array.from(state.overrides)).toContainEqual([dummyMessage1Cid, 100]);
});
