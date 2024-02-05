import {
  EmbedBuilder,
  SlashCommandBuilder,
  inlineCode,
  roleMention,
} from "discord.js";

import { BOT_DEV_RID } from "../../config";
import wordnikService from "../../services/wordnik.service";
import { CommandBuilder } from "../../types/command.types";
import { toBulletedList } from "../../utils/markdown.utils";
import { addEphemeralOption } from "../../utils/options.utils";

const dictionary = new CommandBuilder();

const slashCommandDefinition = new SlashCommandBuilder()
  .setName("dictionary")
  .setDescription("Look up the definition(s) of a word")
  .addStringOption(input => input
    .setName("word")
    .setDescription("The word to search for.")
    .setRequired(true),
  );
addEphemeralOption(slashCommandDefinition);

dictionary.define(slashCommandDefinition);
// TODO: Commands should have a cooldown mechanism too. With external APIs like
// Wordnik, we don't want users to cause a 429.
dictionary.execute(async interaction => {
  const word = interaction.options.getString("word", true);
  const ephemeral = !!interaction.options.getBoolean("ephemeral");

  const definitions = await wordnikService.getDefinitions(word);
  if (definitions === "Not Found") {
    await interaction.reply({
      content: `I don't think ${inlineCode(word)} is a valid word!`,
      ephemeral: true,
    });
    return false;
  }
  if (definitions === "Unknown Error") {
    await interaction.reply({
      content:
        "Oops! My dictionary service is experiencing unexpected difficulties " +
        `right now. Try again later or let a ${roleMention(BOT_DEV_RID)} know!`,
      ephemeral: true,
    });
    return false;
  }

  const embed = new EmbedBuilder().setTitle(word);
  for (const [partOfSpeech, definitionEntries] of definitions) {
    embed.addFields({
      name: partOfSpeech,
      value: toBulletedList(definitionEntries),
    });
  }

  await interaction.reply({
    embeds: [embed],
    ephemeral,
  });
  return true;
});

const dictionarySpec = dictionary.toSpec();
export default dictionarySpec;
