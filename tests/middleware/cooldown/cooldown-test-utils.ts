import { Message } from "discord.js";

import {
  GlobalCooldownDump,
  GlobalCooldownSpec,
  ICooldownManager,
  PerChannelCooldownDump,
  PerChannelCooldownSpec,
  PerUserCooldownDump,
  PerUserCooldownSpec,
} from "../../../src/middleware/cooldown.middleware";

export const dummyBypasserUid = "4242424242";

export const initGlobalCDSpec: GlobalCooldownSpec = {
  type: "global",
  seconds: 60,
  bypassers: [dummyBypasserUid],
  onCooldown: jest.fn(),
};

export const dummyOverriderUid = "2244668800";

export const initUserCDSpec: PerUserCooldownSpec = {
  type: "user",
  defaultSeconds: 60,
  overrides: new Map([
    [dummyBypasserUid, 0],
    [dummyOverriderUid, 30],
  ]),
  onCooldown: jest.fn(),
};

export const dummyBypasserCid = "6464646464";
export const dummyOverriderCid = "1133557799";

export const initChannelCDSpec: PerChannelCooldownSpec = {
  type: "channel",
  defaultSeconds: 60,
  overrides: new Map([
    [dummyBypasserCid, 0],
    [dummyOverriderCid, 30],
  ]),
  onCooldown: jest.fn(),
};

export const dummyMessage1Uid = "123456789";
export const dummyMessage2Uid = "987654321";

export const dummyMessage1Cid = "246813579";
export const dummyMessage2Cid = "975318642";

export const dummyMessage1 = {
  author: { id: dummyMessage1Uid },
  channelId: dummyMessage1Cid,
  channel: { id: dummyMessage1Cid },
} as Message;

export const dummyMessage2 = {
  author: { id: dummyMessage2Uid },
  channelId: dummyMessage2Cid,
  channel: { id: dummyMessage2Cid },
} as Message;

/**
 * Expect that the state dump of a global type cooldown initialized with the
 * dummy initial spec is of the expected structure.
 */
export function expectGlobalCooldownDump(manager: ICooldownManager): void {
  manager.refresh(dummyMessage1);
  const state = manager.dump() as GlobalCooldownDump;
  expect(state).toEqual<GlobalCooldownDump>({
    type: initGlobalCDSpec.type,
    seconds: initGlobalCDSpec.seconds,
    expiration: expect.any(Date),
    bypassers: initGlobalCDSpec.bypassers!,
  });
  const now = new Date();
  expect(state.expiration.getTime()).toBeGreaterThan(now.getTime());
}

/**
 * Expect that the state dump of a per-user type cooldown initialized with the
 * dummy initial spec is of the expected structure.
 */
export function expectUserCooldownDump(manager: ICooldownManager): void {
  manager.refresh(dummyMessage1);
  manager.refresh(dummyMessage2);
  const state = manager.dump() as PerUserCooldownDump;
  expect(state).toEqual<PerUserCooldownDump>({
    type: initUserCDSpec.type,
    defaultSeconds: initUserCDSpec.defaultSeconds,
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
}

/**
 * Expect that the state dump of a per-channel type cooldown initialized with
 * the dummy initial spec is of the expected structure.
 */
export function expectChannelCooldownDump(manager: ICooldownManager): void {
  manager.refresh(dummyMessage1);
  manager.refresh(dummyMessage2);
  const state = manager.dump() as PerChannelCooldownDump;
  expect(state).toEqual<PerChannelCooldownDump>({
    type: initChannelCDSpec.type,
    defaultSeconds: initChannelCDSpec.defaultSeconds,
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
}
