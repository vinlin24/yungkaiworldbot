import { z } from "zod";

import {
  CooldownSpec,
  DisabledCooldownDump,
  DynamicCooldownManager,
} from "../../src/middleware/cooldown.middleware";
import { getAllPermute2, unorderedEquals } from "../../src/utils/iteration.utils";
import { expectMatchingSchema } from "../test-utils";
import {
  channelCooldownDumpSchema,
  disabledCooldownDumpSchema,
  dummyMessage1,
  expectChannelCooldownDump,
  expectGlobalCooldownDump,
  expectUserCooldownDump,
  globalCooldownDumpSchema,
  initChannelCDSpec,
  initGlobalCDSpec,
  initUserCDSpec,
  userCooldownDumpSchema,
} from "./cooldown/cooldown-test-utils";

let manager: DynamicCooldownManager;

beforeEach(() => {
  manager = new DynamicCooldownManager();
});

describe("supporting all initial spec types", () => {
  it("should support initial global type", () => {
    manager = new DynamicCooldownManager(initGlobalCDSpec);
    expectGlobalCooldownDump(manager);
  });

  it("should support initial user type", () => {
    manager = new DynamicCooldownManager(initUserCDSpec);
    expectUserCooldownDump(manager);
  });

  it("should support initial channel type", () => {
    manager = new DynamicCooldownManager(initChannelCDSpec);
    expectChannelCooldownDump(manager);
  });
});

describe("switching between spec types", () => {
  const TEST_MATRIX: [CooldownSpec["type"], CooldownSpec, z.ZodObject<any>][]
    = [
      ["global", initGlobalCDSpec, globalCooldownDumpSchema],
      ["user", initUserCDSpec, userCooldownDumpSchema],
      ["channel", initChannelCDSpec, channelCooldownDumpSchema],
      ["disabled", { type: "disabled" }, disabledCooldownDumpSchema],
    ] as const;

  // NOTE: Code smell or not? getAllPermute2 has a test, but coupling
  // dependencies inside tests like this may or may not be bad.
  for (const [start, end] of getAllPermute2(TEST_MATRIX)) {
    const [startType, startSpec, startSchema] = start;
    const [endType, endSpec, endSchema] = end;
    it(`should switch from ${startType} type to ${endType} type`, () => {
      manager.set(startSpec);
      expectMatchingSchema(manager.dump(), startSchema);
      manager.set(endSpec);
      expectMatchingSchema(manager.dump(), endSchema);
    });

    // Special policy for preserving bypassers when switching b/w global & user.
    if (unorderedEquals([startType, endType], ["global", "user"])) {
      it(`should preserve bypassers when ${startType} -> ${endType}`, () => {
        const newBypasserUid = "3344556677";
        manager.set(startSpec);
        manager.setBypass(true, newBypasserUid);
        manager.set(endSpec);
        const bypassers = manager.getBypassers();
        expect(bypassers).toContain(newBypasserUid);
      });
    }
  }
});

describe("edge cases when cooldown is disabled", () => {
  beforeEach(() => {
    manager = new DynamicCooldownManager({ type: "disabled" });
  });

  it("should treat no initial spec as initializing with disabled type", () => {
    const managerOmittedArg = new DynamicCooldownManager();
    expect(managerOmittedArg.type).toEqual<CooldownSpec["type"]>("disabled");
  });

  it("should know if it's not observing any cooldown type", () => {
    expect(manager.type).toEqual<CooldownSpec["type"]>("disabled");
  });

  it("should return infinite duration if cooldown disabled", () => {
    expect(manager.duration).toEqual(Infinity);
  });

  it("should always appear inactive if cooldown disabled", () => {
    manager.refresh(dummyMessage1);
    expect(manager.isActive(dummyMessage1)).toEqual(false);
  });

  it("should return no bypassers if cooldown disabled", () => {
    expect(manager.getBypassers()).toHaveLength(0);
  });

  it("should dump the expected state", () => {
    expect(manager.dump()).toEqual<DisabledCooldownDump>({ type: "disabled" });
  });
});
