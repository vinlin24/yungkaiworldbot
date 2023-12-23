import {
  CommandInteractionOptionResolver,
  Events,
  SlashCommandBuilder,
} from "discord.js";

import getLogger from "../../logger";
import { RoleLevel, checkPrivilege } from "../../middleware/privilege.middleware";
import lukeService from "../../services/luke.service";
import {
  Command,
  Controller,
  Listener,
} from "../../types/controller.types";
import { formatContext } from "../../utils/logging.utils";

const log = getLogger(__filename);

const onMessageCreate = new Listener<Events.MessageCreate>({
  name: Events.MessageCreate,
});

onMessageCreate.execute(async (message) => {
  await lukeService.processMessage(message);
});

const setMeowChance = new Command(new SlashCommandBuilder()
  .setName("set-meow-chance")
  .setDescription("Set probability of meowing at Luke's message.")
  .addNumberOption(option =>
    option.setName("probability")
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(1)
      .setDescription("Probability expressed as a decimal.")
  )
);

setMeowChance.check(checkPrivilege(RoleLevel.BABY_MOD));

setMeowChance.execute(async (interaction) => {
  const oldProbability = lukeService.getMeowChance();
  const options = interaction.options as CommandInteractionOptionResolver;
  const newProbability = options.getNumber("probability", true);
  lukeService.setMeowChance(newProbability);

  const context = formatContext(interaction);
  log.info(`${context}: set Luke meow chance to ${newProbability}.`);

  interaction.reply(
    `Updated Luke meow chance from ${oldProbability} to ${newProbability}.`
  );
})

const spec: Controller = {
  name: "luke",
  commands: [setMeowChance],
  listeners: [onMessageCreate],
};

export default spec;
