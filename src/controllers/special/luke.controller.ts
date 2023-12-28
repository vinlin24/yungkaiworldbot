import {
  CommandInteractionOptionResolver,
  SlashCommandBuilder,
} from "discord.js";

import getLogger from "../../logger";
import {
  channelPollutionAllowed,
  messageFrom,
} from "../../middleware/filters.middleware";
import {
  RoleLevel,
  checkPrivilege,
} from "../../middleware/privilege.middleware";
import lukeService from "../../services/luke.service";
import {
  Command,
  Controller,
  MessageListener,
} from "../../types/controller.types";
import { replySilently } from "../../utils/interaction.utils";
import { formatContext } from "../../utils/logging.utils";

const log = getLogger(__filename);

const dadJoker = new MessageListener("dad-joke");

dadJoker.filter(channelPollutionAllowed);
dadJoker.cooldown.set({
  type: "user",
  defaultSeconds: 600,
});
dadJoker.execute(lukeService.processDadJoke);

const randomMeower = new MessageListener("meow");

randomMeower.filter(channelPollutionAllowed);
randomMeower.filter(messageFrom("LUKE"));
randomMeower.filter(_ => Math.random() < lukeService.getMeowChance());
randomMeower.execute(async (message) => {
  await replySilently(message, "meow meow");
  log.debug(`${formatContext(message)}: meowed at Luke.`);
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

const spec = new Controller({
  name: "luke",
  commands: [setMeowChance],
  listeners: [dadJoker, randomMeower],
});

export default spec;
