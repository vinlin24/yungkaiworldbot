import {
  CommandInteractionOptionResolver,
  SlashCommandBuilder,
} from "discord.js";

import getLogger from "../../logger";
import {
  RoleLevel,
  checkPrivilege,
} from "../../middleware/privilege.middleware";
import cxtieService from "../../services/cxtie.service";
import { CommandBuilder } from "../../types/command.types";
import { formatContext } from "../../utils/logging.utils";

const log = getLogger(__filename);

const setReactChance = new CommandBuilder();

setReactChance.define(new SlashCommandBuilder()
  .setName("set-anti-cxtie-react-chance")
  .setDescription("Set probability of reacting with anti-Cxtie emojis.")
  .addNumberOption(input => input
    .setName("probability")
    .setRequired(true)
    .setMinValue(0)
    .setMaxValue(1)
    .setDescription("Probability expressed as a decimal.")
  )
);

setReactChance.check(checkPrivilege(RoleLevel.BABY_MOD));
setReactChance.execute(async (interaction) => {
  const oldProbability = cxtieService.reactChance;
  const options = interaction.options as CommandInteractionOptionResolver;
  const newProbability = options.getNumber("probability", true);
  cxtieService.reactChance = newProbability;

  const context = formatContext(interaction);
  log.info(`${context}: set anti-Cxtie react chance to ${newProbability}.`);

  interaction.reply(
    "Updated anti-Cxtie react chance from " +
    `${oldProbability} to ${newProbability}.`
  );
});

export default setReactChance.toSpec();
