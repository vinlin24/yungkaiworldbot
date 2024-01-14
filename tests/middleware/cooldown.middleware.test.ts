import { z } from "zod";

import {
  CooldownSpec,
  DynamicCooldownManager,
} from "../../src/middleware/cooldown.middleware";
import { getAllPermute2 } from "../../src/utils/iteration.utils";
import { expectMatchingSchema } from "../test-utils";
import {
  channelCooldownDumpSchema,
  disabledCooldownDumpSchema,
  expectChannelCooldownDump,
  expectGlobalCooldownDump,
  expectUserCooldownDump,
  globalCooldownDumpSchema,
  initChannelCDSpec,
  initGlobalCDSpec,
  initUserCDSpec,
  userCooldownDumpSchema
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

    if (startType !== "disabled" && endType !== "disabled") {
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
