import { Message } from "discord.js";

import {
  CooldownSpec,
  PerChannelCooldownDump,
  PerChannelCooldownManager,
  PerChannelCooldownSpec,
} from "../../../src/middleware/cooldown.middleware";

const dummyBypasserCid = "4242424242";
const dummyOverriderCid = "2244668800";

const initSpec: PerChannelCooldownSpec = {
  type: "channel",
  defaultSeconds: 60,
  overrides: new Map([
    [dummyBypasserCid, 0],
    [dummyOverriderCid, 30],
  ]),
  onCooldown: jest.fn(),
};

const dummyMessage1Cid = "123456789";
const dummyMessage2Cid = "987654321";
const dummyMessage1 = {
  channelId: dummyMessage1Cid,
  channel: { id: dummyMessage1Cid },
} as Message;
const dummyMessage2 = {
  channelId: dummyMessage2Cid,
  channel: { id: dummyMessage2Cid },
} as Message;

let manager: PerChannelCooldownManager;

beforeEach(() => {
  manager = new PerChannelCooldownManager(initSpec);
});

// TODO: These are literally identical to per-user cooldown tests but with
// slightly renamed variables and descriptions.

it("should know that it's observing a channel cooldown type", () => {
  expect(manager.type).toEqual<CooldownSpec["type"]>("channel");
});

it("should know its default duration", () => {
  expect(manager.duration).toEqual(initSpec.defaultSeconds);
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

it("should dump the expected state", () => {
  manager.refresh(dummyMessage1);
  manager.refresh(dummyMessage2);
  const state = manager.dump();
  expect(state).toEqual<PerChannelCooldownDump>({
    type: initSpec.type,
    defaultSeconds: initSpec.defaultSeconds,
    expirations: expect.any(Map),
    overrides: expect.any(Map),
  });
  const now = new Date();
  expect(Array.from(state.overrides)).toEqual([
    [dummyBypasserCid, 0],
    [dummyOverriderCid, 30],
  ]);
  expect(Array.from(state.expirations.keys()))
    .toEqual([dummyMessage1Cid, dummyMessage2Cid]);
  for (const expiration of state.expirations.values()) {
    expect(expiration.getTime()).toBeGreaterThan(now.getTime());
  }
});

it("should support adding overrides", () => {
  manager.setDuration(100, dummyMessage1Cid);
  const state = manager.dump();
  expect(Array.from(state.overrides)).toContainEqual([dummyMessage1Cid, 100]);
});
