import { CommandInteractionOptionResolver, SlashCommandBuilder } from "discord.js";
import { BotClient } from "../../client";
import { RoleLevel, checkPrivilege } from "../../middleware/privilege.middleware";
import { Command } from "../../types/command.types";
import { Controller, MessageListener } from "../../types/controller.types";

const listCooldowns = new Command(new SlashCommandBuilder()
  .setName("cooldowns")
  .setDescription(
    "List current cooldowns associated with message creation events."
  )
  .addBooleanOption(input => input
    .setName("broadcast")
    .setDescription("Whether to respond publicly instead of ephemerally")
  )
);

listCooldowns.check(checkPrivilege(RoleLevel.DEV)); // TEMP.
listCooldowns.execute(async (interaction) => {
  const client = interaction.client as BotClient;
  const listenerList = client.listenerSpecs
    .filter(listener => listener instanceof MessageListener)
    .mapValues(listener => listener as MessageListener);

  let response = "";
  for (const [id, listener] of listenerList) {
    const dump = listener.cooldown.dump();
    if (dump !== null)
      response += `__**${id}** Cooldown__\n${dump}\n`;
  }

  if (!response) {
    response = (
      "The bot isn't listening for anything that could have a cooldown " +
      "at the moment!"
    );
  }

  const options = interaction.options as CommandInteractionOptionResolver;
  const broadcast = options.getBoolean("broadcast");
  await interaction.reply({
    content: response,
    ephemeral: !broadcast,
    allowedMentions: { parse: [] }, // Suppress mention pinging.
  });
});

const controller: Controller = {
  name: "cooldowns",
  commands: [listCooldowns],
  listeners: [],
};

export default controller;
