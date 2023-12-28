import {
  APIApplicationCommandOptionChoice,
  ActivityType,
  CommandInteractionOptionResolver,
  PresenceUpdateStatus,
  SlashCommandBuilder,
} from "discord.js";

import getLogger from "../../logger";
import {
  RoleLevel,
  checkPrivilege,
} from "../../middleware/privilege.middleware";
import { Command, Controller } from "../../types/controller.types";
import { iterateEnum } from "../../utils/iteration.utils";
import { formatContext } from "../../utils/logging.utils";

const log = getLogger(__filename);

type Choice<T> = APIApplicationCommandOptionChoice<T>;
type ActivityTypeName = keyof typeof ActivityType;
type PresenceUpdateStatusName
  = Exclude<keyof typeof PresenceUpdateStatus, "Offline">;

const activityTypeNames: ActivityTypeName[]
  = iterateEnum(ActivityType)
    .map(([name]) => name)
    // TODO: enum values (numbers) being included through iterateEnum somehow.
    .filter(name => isNaN(Number(name)));
const activityChoices: Choice<ActivityTypeName>[]
  = activityTypeNames.map(name => ({ name, value: name }));

const statusTypeNames: PresenceUpdateStatusName[]
  = ["Online", "DoNotDisturb", "Idle", "Invisible"];
const statusChoices: Choice<PresenceUpdateStatusName>[]
  = statusTypeNames.map(name => ({ name, value: name }));

const changePresence = new Command(new SlashCommandBuilder()
  .setName("presence")
  .setDescription("Update bot presence.")
  .addStringOption(input => input
    .setName("activity_type")
    .setDescription("Activity type (determines the verb used).")
    .addChoices(...activityChoices)
  )
  .addStringOption(input => input
    .setName("activity_name")
    .setDescription("Text to follow the activity verb.")
  )
  .addStringOption(input => input
    .setName("status")
    .setDescription("Status of the bot.")
    .addChoices(...statusChoices)
  )
  .addBooleanOption(input => input
    .setName("clear_activity")
    .setDescription("Clear current activity (ignores other activity options)")
  )
);

changePresence.check(checkPrivilege(RoleLevel.DEV));
changePresence.execute(async (interaction) => {
  const context = formatContext(interaction);
  const { client } = interaction;

  const options = interaction.options as CommandInteractionOptionResolver;
  const activityName
    = options.getString("activity_name") as string | null;
  const activityType
    = options.getString("activity_type") as ActivityTypeName | null;
  const status
    = options.getString("status") as PresenceUpdateStatusName | null;
  const clearActivity
    = options.getBoolean("clear_activity") as boolean | null;

  // Ignore the other activity options and just clear the activity.
  if (clearActivity) {
    client.user.setActivity();
  } else {
    // Activity requires a name. Type is optional. If the caller specifies a
    // type without a name, we can't make the API call, so it's an error.
    if (activityType && !activityName) {
      log.debug(`${context}: attempted to set bot activity without a name`);
      await interaction.reply({
        content: "Activity requires a name!",
        ephemeral: true,
      });
      return;
    }

    if (activityName) {
      const activityTypeValue = activityType
        ? ActivityType[activityType]
        : undefined;
      client.user.setActivity({
        name: activityName,
        type: activityTypeValue,
      });
      log.info(
        `${context}: set bot activity to ` +
        `(${activityTypeValue}, ${activityName}).`
      );
    }
  }

  if (status) {
    const statusValue = PresenceUpdateStatus[status];
    client.user.setStatus(statusValue);
    log.info(`${context}: set bot status to ${statusValue}.`);
  }

  await interaction.reply("👍");
});

const controller = new Controller({
  name: "presence",
  commands: [changePresence],
  listeners: [],
});

export default controller;
