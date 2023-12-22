import {
  CommandInteractionOptionResolver,
  Events,
  SlashCommandBuilder,
} from "discord.js";

import lukeController from "../../controllers/luke.controller";
import log from "../../logger";
import { RoleLevel, checkPrivilege } from "../../middleware/privilege.middleware";
import {
  CommandSpec,
  EventSpec,
  ModuleSpec,
} from "../../types/spec.types";
import { formatContext } from "../../utils/logging.utils";

const onMessageCreate = new EventSpec<Events.MessageCreate>({
  name: Events.MessageCreate,
});

onMessageCreate.execute(async (message) => {
  await lukeController.processMessage(message);
});

const setMeowChance = new CommandSpec(new SlashCommandBuilder()
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

setMeowChance.prehook(checkPrivilege(RoleLevel.BABY_MOD));

setMeowChance.execute(async (interaction) => {
  const oldProbability = lukeController.getMeowChance();
  const options = interaction.options as CommandInteractionOptionResolver;
  const newProbability = options.getNumber("probability", true);
  lukeController.setMeowChance(newProbability);

  const context = formatContext(interaction);
  log.info(`${context}: set Luke meow chance to ${newProbability}.`);

  interaction.reply(
    `Updated Luke meow chance from ${oldProbability} to ${newProbability}.`
  );
})

const spec: ModuleSpec = {
  name: "luke",
  commands: [setMeowChance],
  events: [onMessageCreate],
};

export default spec;
