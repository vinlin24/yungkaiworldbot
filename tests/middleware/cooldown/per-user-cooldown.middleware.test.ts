import { Message } from "discord.js";

import {
  CooldownSpec,
  PerUserCooldownDump,
  PerUserCooldownManager,
  PerUserCooldownSpec,
} from "../../../src/middleware/cooldown.middleware";

const dummyBypasserUid = "4242424242";
const dummyOverriderUid = "2244668800";

const initSpec: PerUserCooldownSpec = {
  type: "user",
  defaultSeconds: 60,
  overrides: new Map([
    [dummyBypasserUid, 0],
    [dummyOverriderUid, 30],
  ]),
  onCooldown: jest.fn(),
};

const dummyMessage1Uid = "123456789";
const dummyMessage2Uid = "987654321";
const dummyMessage1 = { author: { id: dummyMessage1Uid } } as Message;
const dummyMessage2 = { author: { id: dummyMessage2Uid } } as Message;

let manager: PerUserCooldownManager;

beforeEach(() => {
  manager = new PerUserCooldownManager(initSpec);
});

it("should know that it's observing a user cooldown type", () => {
  expect(manager.type).toEqual<CooldownSpec["type"]>("user");
});

it("should know its default duration", () => {
  expect(manager.duration).toEqual(60);
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

it("should dump the expected state", () => {
  manager.refresh(dummyMessage1);
  manager.refresh(dummyMessage2);
  const state = manager.dump();
  expect(state).toEqual<PerUserCooldownDump>({
    type: initSpec.type,
    defaultSeconds: initSpec.defaultSeconds,
    expirations: expect.any(Map),
    overrides: expect.any(Map),
  });
  const now = new Date();
  expect(Array.from(state.overrides)).toEqual([
    [dummyBypasserUid, 0],
    [dummyOverriderUid, 30],
  ]);
  expect(Array.from(state.expirations.keys()))
    .toEqual([dummyMessage1Uid, dummyMessage2Uid]);
  for (const expiration of state.expirations.values()) {
    expect(expiration.getTime()).toBeGreaterThan(now.getTime());
  }
});

it("should support adding overrides", () => {
  manager.setDuration(100, dummyMessage1Uid);
  const state = manager.dump();
  expect(Array.from(state.overrides)).toContainEqual([dummyMessage1Uid, 100]);
});
