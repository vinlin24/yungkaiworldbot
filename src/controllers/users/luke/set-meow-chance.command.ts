import {
  CommandInteractionOptionResolver,
  SlashCommandBuilder,
} from "discord.js";

import getLogger from "../../../logger";
import {
  RoleLevel,
  checkPrivilege,
} from "../../../middleware/privilege.middleware";
import lukeService from "../../../services/luke.service";
import { CommandBuilder } from "../../../types/command.types";
import { formatContext } from "../../../utils/logging.utils";

const log = getLogger(__filename);

const setMeowChance = new CommandBuilder();

setMeowChance.define(new SlashCommandBuilder()
  .setName("set-meow-chance")
  .setDescription("Set probability of meowing at Luke's message.")
  .addNumberOption(option =>
    option.setName("probability")
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(1)
      .setDescription("Probability expressed as a decimal."),
  ),
);

setMeowChance.check(checkPrivilege(RoleLevel.BABY_MOD));
setMeowChance.execute(async (interaction) => {
  const oldProbability = lukeService.getMeowChance();
  const options = interaction.options as CommandInteractionOptionResolver;
  const newProbability = options.getNumber("probability", true);
  lukeService.setMeowChance(newProbability);

  const context = formatContext(interaction);
  log.info(`${context}: set Luke meow chance to ${newProbability}.`);

  await interaction.reply(
    `Updated Luke meow chance from ${oldProbability} to ${newProbability}.`,
  );
});

const setMeowChanceSpec = setMeowChance.toSpec();
export default setMeowChanceSpec;
