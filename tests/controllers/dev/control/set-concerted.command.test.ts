import { bold } from "discord.js";

import { KAI_RID } from "../../../../src/config";
import setConcertedReactSpec from "../../../../src/controllers/dev/control/set-concerted.command";
import { RoleLevel } from "../../../../src/middleware/privilege.middleware";
import devControlService from "../../../../src/services/dev-control.service";
import { MockInteraction } from "../../../test-utils";

let mock: MockInteraction;
beforeEach(() => { mock = new MockInteraction(setConcertedReactSpec); });

it("should require privilege level >= DEV", async () => {
  mock
    .mockCaller({ roleIds: [KAI_RID] })
    .mockOption("Boolean", "enabled", true);
  jest.replaceProperty(devControlService, "reactWithDev", false);

  await mock.simulateCommand();

  expect(devControlService.reactWithDev).toEqual(false); // i.e. Unchanged.
  mock.expectMentionedMissingPrivilege(RoleLevel.DEV);
});

it("should set the service state to be true", async () => {
  mock
    .mockCallerIsDev()
    .mockOption("Boolean", "reactions_enabled", true);
  jest.replaceProperty(devControlService, "reactWithDev", false);

  await mock.simulateCommand();

  expect(devControlService.reactWithDev).toEqual(true);
  mock.expectRepliedWith({
    ephemeral: true,
    content: expect.stringContaining(
      `${bold("Enabled")} concerted DEV reactions`,
    ),
  });
});

it("should set the service state to be false", async () => {
  mock
    .mockCallerIsDev()
    .mockOption("Boolean", "reactions_enabled", false);
  jest.replaceProperty(devControlService, "reactWithDev", true);

  await mock.simulateCommand();

  expect(devControlService.reactWithDev).toEqual(false);
  mock.expectRepliedWith({
    ephemeral: true,
    content: expect.stringContaining(
      `${bold("Disabled")} concerted DEV reactions`,
    ),
  });
});
