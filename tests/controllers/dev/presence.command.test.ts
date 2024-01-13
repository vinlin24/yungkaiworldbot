import {
  ActivityOptions,
  ActivityType,
  PresenceUpdateStatus,
} from "discord.js";

import config from "../../../src/config";
import presenceSpec, {
  ActivityTypeName,
  PresenceUpdateStatusName,
} from "../../../src/controllers/dev/presence.command";
import { MockInteraction } from "../../test-utils";

let mock: MockInteraction;
beforeEach(() => {
  mock = new MockInteraction(presenceSpec);
});

it("should require privilege >= DEV", async () => {
  mock.mockCallerRoles(config.KAI_RID);
  mock.mockOption("Boolean", "clear_activity", true);
  await mock.simulateCommand();
  expect(mock.interaction.client.user.setActivity).not.toHaveBeenCalled();
  expect(mock.interaction.client.user.setStatus).not.toHaveBeenCalled();
  mock.expectRepliedWith({
    // Any mention of the DEV level.
    content: expect.stringMatching(/\bDEV\b/i),
    ephemeral: true,
  });
});

it("should clear the activity as long as the flag is set", async () => {
  mock
    .mockCallerRoles(config.BOT_DEV_RID)
    .mockOption("Boolean", "clear_activity", true)
    .mockOption("String", "activity_name", "unit testing!")
  await mock.simulateCommand();
  expect(mock.interaction.client.user.setActivity).toHaveBeenLastCalledWith();
  mock.expectReplied();
});

it("should disallow providing an activity type without a name", async () => {
  mock.mockCallerRoles(config.BOT_DEV_RID);
  mock.mockOption<ActivityTypeName>("String", "activity_type", "Listening");
  await mock.simulateCommand();
  expect(mock.interaction.client.user.setActivity).not.toHaveBeenCalled();
  expect(mock.interaction.client.user.setStatus).not.toHaveBeenCalled();
  mock.expectRepliedWith({
    content: expect.stringMatching(/\bname\b/i),
    ephemeral: true,
  });
});

it("should set the activity name if provided", async () => {
  mock
    .mockCallerRoles(config.BOT_DEV_RID)
    .mockOption("String", "activity_name", "unit testing!");
  await mock.simulateCommand();
  expect(mock.interaction.client.user.setActivity).toHaveBeenLastCalledWith(
    expect.objectContaining<ActivityOptions>({ name: "unit testing!" }),
  );
  expect(mock.interaction.client.user.setStatus).not.toHaveBeenCalled();
  mock.expectReplied();
});

it("should set the activity name with type if provided", async () => {
  mock
    .mockCallerRoles(config.BOT_DEV_RID)
    .mockOption("String", "activity_name", "unit testing!")
    .mockOption<ActivityTypeName>("String", "activity_type", "Listening");
  await mock.simulateCommand();
  expect(mock.interaction.client.user.setActivity).toHaveBeenLastCalledWith(
    expect.objectContaining<ActivityOptions>({
      name: "unit testing!",
      type: ActivityType.Listening,
    }),
  );
  expect(mock.interaction.client.user.setStatus).not.toHaveBeenCalled();
  mock.expectReplied();
});

it("should set the status if provided", async () => {
  mock
    .mockCallerRoles(config.BOT_DEV_RID)
    .mockOption<PresenceUpdateStatusName>("String", "status", "Idle");
  await mock.simulateCommand();
  expect(mock.interaction.client.user.setStatus).toHaveBeenLastCalledWith(
    PresenceUpdateStatus.Idle,
  );
  expect(mock.interaction.client.user.setActivity).not.toHaveBeenCalled();
  mock.expectReplied();
});

it("should set everything if all provided", async () => {
  mock
    .mockCallerRoles(config.BOT_DEV_RID)
    .mockOption<PresenceUpdateStatusName>("String", "status", "Idle")
    .mockOption<ActivityTypeName>("String", "activity_type", "Listening")
    .mockOption("String", "activity_name", "unit testing!");
  await mock.simulateCommand();
  expect(mock.interaction.client.user.setStatus).toHaveBeenLastCalledWith(
    PresenceUpdateStatus.Idle,
  );
  expect(mock.interaction.client.user.setActivity).toHaveBeenLastCalledWith(
    expect.objectContaining<ActivityOptions>({
      name: "unit testing!",
      type: ActivityType.Listening,
    }),
  );
});
