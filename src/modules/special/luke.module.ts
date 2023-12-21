import {
  CommandInteractionOptionResolver,
  Events,
  SlashCommandBuilder,
} from "discord.js";

import lukeController from "../../controllers/luke.controller";
import log from "../../logger";
import {
  CommandSpec,
  EventSpec,
  ModuleSpec,
  RoleLevel,
} from "../../types/spec.types";
import { formatContext } from "../../utils/logging.utils";

const onMessageCreate: EventSpec<Events.MessageCreate> = {
  name: Events.MessageCreate,

  async execute(message) {
    await lukeController.processMessage(message);
  },
};

const setMeowChance: CommandSpec = {
  privilege: RoleLevel.BABY_MOD,

  data: new SlashCommandBuilder()
    .setName("set-meow-chance")
    .setDescription("Set probability of meowing at Luke's message.")
    .addNumberOption(option =>
      option.setName("probability")
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(1)
        .setDescription("Probability expressed as a decimal.")
    ),

  async execute(interaction) {
    const oldProbability = lukeController.getMeowChance();
    const options = interaction.options as CommandInteractionOptionResolver;
    const newProbability = options.getNumber("probability", true);
    lukeController.setMeowChance(newProbability);

    const context = formatContext(interaction);
    log.info(`${context}: set Luke meow chance to ${newProbability}.`);

    interaction.reply(
      `Updated Luke meow chance from ${oldProbability} to ${newProbability}.`
    );
  },
}

const spec: ModuleSpec = {
  name: "luke",
  commands: [setMeowChance],
  events: [onMessageCreate],
};

export default spec;
