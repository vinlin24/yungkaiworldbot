import { SlashCommandBuilder, bold } from "discord.js";

import getLogger from "../../../logger";
import {
  RoleLevel,
  checkPrivilege,
} from "../../../middleware/privilege.middleware";
import devControlService from "../../../services/dev-control.service";
import { CommandBuilder } from "../../../types/command.types";
import { formatContext } from "../../../utils/logging.utils";

const log = getLogger(__filename);

const setConcertedReact = new CommandBuilder();

setConcertedReact.define(new SlashCommandBuilder()
  .setName("set-concerted-react")
  .setDescription("Set whether the bot should copy dev reactions.")
  .addBooleanOption(input => input
    .setName("enabled")
    .setDescription("Whether this feature is enabled.")
    .setRequired(true),
  ),
);

setConcertedReact.check(checkPrivilege(RoleLevel.DEV));
setConcertedReact.execute(async interaction => {
  const enabled = interaction.options.getBoolean("enabled", true);
  devControlService.reactWithDev = enabled;

  log.info(`${formatContext(interaction)}: set reactWithDev=${enabled}.`);
  await interaction.reply({
    ephemeral: true,
    content:
      `${bold(enabled ? "Enabled" : "Disabled")} concerted DEV reactions.`,
  });
});

const setConcertedReactSpec = setConcertedReact.toSpec();
export default setConcertedReactSpec;
