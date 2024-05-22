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
  .setName("set-concerted")
  .setDescription("Set whether the bot should copy dev")
  .addBooleanOption(input => input
    .setName("reactions_enabled")
    .setDescription("Whether this feature is enabled for reactions."),
  )
  .addBooleanOption(input => input
    .setName("messages_enabled")
    .setDescription("Whether this feature is enabled for messages."),
  ),
);

setConcertedReact.check(checkPrivilege(RoleLevel.DEV));
setConcertedReact.execute(async interaction => {
  // Default to the current state if not provided.
  const reactionsEnabled = interaction.options.getBoolean("reactions_enabled")
    ?? devControlService.reactWithDev;
  const messagesEnabled = interaction.options.getBoolean("messages_enabled")
    ?? devControlService.sendWithDev;

  devControlService.reactWithDev = reactionsEnabled;
  devControlService.sendWithDev = messagesEnabled;

  log.info(
    `${formatContext(interaction)}: set reactWithDev=${reactionsEnabled}, ` +
    `sendWithDev=${messagesEnabled}.`,
  );
  await interaction.reply({
    ephemeral: true,
    content:
      `${bold(reactionsEnabled ? "Enabled" : "Disabled")} concerted DEV ` +
      `reactions, and ${bold(messagesEnabled ? "enabled" : "disabled")} ` +
      "concerted DEV messages.",
  });
});

const setConcertedReactSpec = setConcertedReact.toSpec();
export default setConcertedReactSpec;
