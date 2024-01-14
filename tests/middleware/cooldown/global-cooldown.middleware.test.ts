import { Message } from "discord.js";

import {
  CooldownSpec,
  GlobalCooldownDump,
  GlobalCooldownManager,
  GlobalCooldownSpec,
} from "../../../src/middleware/cooldown.middleware";

const dummyBypasserUid = "4242424242";

const initSpec: GlobalCooldownSpec = {
  type: "global",
  seconds: 60,
  bypassers: [dummyBypasserUid],
  onCooldown: jest.fn(),
};

const dummyMessageUid = "123456789";
const dummyMessage = { author: { id: dummyMessageUid } } as Message;

let manager: GlobalCooldownManager;

beforeEach(() => {
  manager = new GlobalCooldownManager(initSpec);
});

it("should know that it's observing a global cooldown type", () => {
  expect(manager.type).toEqual<CooldownSpec["type"]>("global");
});

it("should know its global duration", () => {
  expect(manager.duration).toEqual(60);
});

it("should clear cooldowns", () => {
  manager.refresh(dummyMessage);
  const isActiveBefore = manager.isActive(dummyMessage);
  manager.clearCooldowns();
  const isActiveAfter = manager.isActive(dummyMessage);
  expect(isActiveAfter).toEqual(false);
  expect(isActiveBefore).toEqual(true);
});

it("should start with the specified bypassers", () => {
  const bypassers = manager.getBypassers();
  expect(bypassers).toEqual([dummyBypasserUid]);
});

it("should support adding bypassers", () => {
  manager.setBypass(true, dummyMessageUid);
  const bypassers = manager.getBypassers();
  expect(bypassers).toContain(dummyMessageUid);

  manager.refresh(dummyMessage);
  const isActive = manager.isActive(dummyMessage);
  expect(isActive).toEqual(false);
});

it("should allow revocation of bypass", () => {
  manager.setBypass(false, dummyMessageUid);
  const bypassers = manager.getBypassers();
  expect(bypassers).not.toContain(dummyMessageUid);

  manager.refresh(dummyMessage);
  const isActive = manager.isActive(dummyMessage);
  expect(isActive).toEqual(true);
});

it("should observe new cooldown duration", () => {
  manager.setDuration(300);
  expect(manager.duration).toEqual(300);
});

it("should dump the expected state", () => {
  manager.refresh(dummyMessage);
  const state = manager.dump();
  expect(state).toEqual<GlobalCooldownDump>({
    type: initSpec.type,
    seconds: initSpec.seconds,
    expiration: expect.any(Date),
    bypassers: initSpec.bypassers!,
  });
  const now = new Date();
  expect(state.expiration.getTime()).toBeGreaterThan(now.getTime());
});
