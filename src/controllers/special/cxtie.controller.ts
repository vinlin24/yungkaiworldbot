import {
  CommandInteractionOptionResolver,
  GuildTextBasedChannel,
  SlashCommandBuilder,
} from "discord.js";

import getLogger from "../../logger";
import {
  contentMatching,
  isPollutionImmuneChannel,
  messageFrom,
} from "../../middleware/filters.middleware";
import {
  RoleLevel,
  checkPrivilege,
} from "../../middleware/privilege.middleware";
import cxtieService from "../../services/cxtie.service";
import {
  Command,
  Controller,
  MessageListener,
} from "../../types/controller.types";
import { GUILD_EMOJIS } from "../../utils/emojis.utils";
import { reactCustomEmoji, replySilently } from "../../utils/interaction.utils";
import { formatContext } from "../../utils/logging.utils";
import uids from "../../utils/uids.utils";

const log = getLogger(__filename);

const onSniffs = new MessageListener("sniffs");

onSniffs.filter(messageFrom("CXTIE"));
onSniffs.filter(message => {
  const sniffsWithPossibleMarkdown = /^(?:[*_`|~]*|#+ )sniffs?[*_`|~]*$/i;
  return !!message.content.match(sniffsWithPossibleMarkdown);
});

onSniffs.cooldown.set({
  type: "global",
  seconds: 600,
});

onSniffs.execute(async (message) => {
  await replySilently(message, message.content);
  const context = formatContext(message);
  log.info(`${context}: echoed sniffs.`);
});

const onChatRevive = new MessageListener("chat-revive");

onChatRevive.filter(message => {
  const chatReviveWithPossibleMD = /^(?:#+ )?chat revive[.!?~]*$/i;
  return !!message.content.match(chatReviveWithPossibleMD);
});
onChatRevive.cooldown.set({
  type: "user",
  defaultSeconds: 600,
});
if (uids.CXTIE === undefined) {
  log.warning("cxtie UID not found.");
} else {
  onChatRevive.cooldown.setBypass(true, uids.CXTIE);
}

onChatRevive.execute(async (message) => {
  await replySilently(message, "no");
});

const randomReacter = new MessageListener("anti-cxtie");

randomReacter.filter(messageFrom("CXTIE"));
randomReacter.filter(_ => Math.random() < cxtieService.reactChance);
randomReacter.execute(async (message) => {
  await reactCustomEmoji(message, GUILD_EMOJIS.HMM);
  await message.react("⏲️");
  await message.react("❓");
  log.debug(`${formatContext(message)}: reacted with anti-Cxtie emojis.`);
});

const setReactChance = new Command(new SlashCommandBuilder()
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

const onCringeEmoji = new MessageListener("cringe-emoji");

onCringeEmoji.filter(messageFrom("CXTIE"));
onCringeEmoji.filter(cxtieService.containsCringeEmojis);
onCringeEmoji.execute(async (message) => {
  await reactCustomEmoji(message, GUILD_EMOJIS.NEKO_GUN);
});

const onTempyWempy = new MessageListener("tempy-wempy");

onTempyWempy.filter(contentMatching(/tempy wempy/i));
onTempyWempy.cooldown.set({
  type: "global",
  seconds: 60,
});
onTempyWempy.execute(async (message) => {
  const channel = message.channel as GuildTextBasedChannel;
  let reacted: boolean;
  if (isPollutionImmuneChannel(channel)) {
    await message.react("🇸");
    await message.react("🇹");
    await message.react("🇴");
    await message.react("🇵");
    reacted = true;
  } else {
    await replySilently(message, "Stop calling me that.");
    reacted = false;
  }
  log.debug(
    `${formatContext(message)}: protested being called "tempy wempy" ` +
    `(${reacted ? "reacted" : "replied"}).`
  );
});

const controller = new Controller({
  name: "cxtie",
  commands: [setReactChance],
  listeners: [
    onSniffs,
    onChatRevive,
    randomReacter,
    onCringeEmoji,
    onTempyWempy,
  ],
}).withCooldownCommands();

export default controller;
