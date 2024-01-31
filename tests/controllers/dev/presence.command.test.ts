jest.mock("../../../src/services/settings.service");

import {
  ActivityOptions,
  ActivityType,
  PresenceUpdateStatus,
} from "discord.js";

import { BOT_DEV_RID, KAI_RID } from "../../../src/config";
import presenceSpec, {
  ActivityTypeName,
  PresenceUpdateStatusName,
} from "../../../src/controllers/dev/presence.command";
import { RoleLevel } from "../../../src/middleware/privilege.middleware";
import settingsService from "../../../src/services/settings.service";
import { MockInteraction } from "../../test-utils";

let mock: MockInteraction;
beforeEach(() => {
  mock = new MockInteraction(presenceSpec);
});

it("should require privilege >= DEV", async () => {
  mock
    .mockCaller({ roleIds: [KAI_RID] })
    .mockOption("Boolean", "clear_activity", true);

  await mock.simulateCommand();

  expect(mock.interaction.client.user.setActivity).not.toHaveBeenCalled();
  expect(mock.interaction.client.user.setStatus).not.toHaveBeenCalled();
  expect(settingsService.getPresence).not.toHaveBeenCalled();
  expect(settingsService.updatePresence).not.toHaveBeenCalled();
  mock.expectMentionedMissingPrivilege(RoleLevel.DEV);
});

it("should clear the activity as long as the flag is set", async () => {
  mock
    .mockCaller({ roleIds: [BOT_DEV_RID] })
    .mockOption("Boolean", "clear_activity", true)
    .mockOption("String", "activity_name", "unit testing!");

  await mock.simulateCommand();

  expect(mock.interaction.client.user.setActivity).toHaveBeenLastCalledWith();
  expect(settingsService.updatePresence).toHaveBeenCalledWith(null);
  mock.expectReplied();
});

it("should disallow providing an activity type without a name", async () => {
  mock
    .mockCaller({ roleIds: [BOT_DEV_RID] })
    .mockOption<ActivityTypeName>("String", "activity_type", "Listening");

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
    .mockCaller({ roleIds: [BOT_DEV_RID] })
    .mockOption("String", "activity_name", "unit testing!");

  await mock.simulateCommand();

  expect(mock.interaction.client.user.setActivity).toHaveBeenLastCalledWith(
    expect.objectContaining<ActivityOptions>({
      name: "unit testing!",
      type: ActivityType.Custom,
    }),
  );
  expect(settingsService.updatePresence).toHaveBeenCalledWith({
    activity_type: "Custom",
    activity_name: "unit testing!",
  });
  expect(mock.interaction.client.user.setStatus).not.toHaveBeenCalled();
  mock.expectReplied();
});

it("should set the activity name with type if provided", async () => {
  mock
    .mockCaller({ roleIds: [BOT_DEV_RID] })
    .mockOption("String", "activity_name", "unit testing!")
    .mockOption<ActivityTypeName>("String", "activity_type", "Listening");

  await mock.simulateCommand();

  expect(mock.interaction.client.user.setActivity).toHaveBeenLastCalledWith(
    expect.objectContaining<ActivityOptions>({
      name: "unit testing!",
      type: ActivityType.Listening,
    }),
  );
  expect(settingsService.updatePresence).toHaveBeenCalledWith({
    activity_type: "Listening",
    activity_name: "unit testing!",
  });
  expect(mock.interaction.client.user.setStatus).not.toHaveBeenCalled();
  mock.expectReplied();
});

it("should set the status if provided", async () => {
  mock
    .mockCaller({ roleIds: [BOT_DEV_RID] })
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
    .mockCaller({ roleIds: [BOT_DEV_RID] })
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
  expect(settingsService.updatePresence).toHaveBeenCalledWith({
    activity_type: "Listening",
    activity_name: "unit testing!",
  });
});
