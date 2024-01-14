import { Events, SlashCommandBuilder } from "discord.js";

import { BotClient } from "../../../bot/client";
import {
  CooldownSpec,
  DynamicCooldownManager,
} from "../../../middleware/cooldown.middleware";
import {
  RoleLevel,
  checkPrivilege,
} from "../../../middleware/privilege.middleware";
import { CommandBuilder } from "../../../types/command.types";
import { formatHoursMinsSeconds } from "../../../utils/dates.utils";
import { toBulletedList } from "../../../utils/markdown.utils";
import { addBroadcastOption } from "../../../utils/options.utils";
import { listenerIdAutocomplete } from "./cooldowns.autocomplete";

const setCooldown = new CommandBuilder();

const slashCommandDefinition = new SlashCommandBuilder()
  .setName(`set-listener-cooldown`)
  .setDescription("Set the cooldown spec for the a message creation listener.")
  .addStringOption(input => input
    .setName("listener")
    .setDescription("Listener ID.")
    .setRequired(true)
    .setAutocomplete(true)
  )
  .addStringOption(input => input
    .setName("type")
    .setDescription("Cooldown type.")
    .setRequired(true)
    .addChoices(
      { name: "Global", value: "global" },
      { name: "Per-user", value: "user" },
      { name: "Per-channel", value: "channel" },
      { name: "Disabled", value: "disabled" },
    )
  )
  .addNumberOption(input => input
    .setName("seconds")
    .setDescription("Default duration of cooldown (in seconds).")
    .setMinValue(0)
  );
addBroadcastOption(slashCommandDefinition);

setCooldown.define(slashCommandDefinition);

setCooldown.check(checkPrivilege(RoleLevel.DEV));

setCooldown.autocomplete(listenerIdAutocomplete);

setCooldown.execute(async (interaction) => {
  const { options } = interaction;
  const broadcast = !!options.getBoolean("options");
  const listenerId = options.getString("listener", true);

  const client = interaction.client as BotClient;
  const listenerMap = client.getListenerSpecs(Events.MessageCreate);

  const listener = listenerMap.get(listenerId);
  if (!listener) {
    await interaction.reply({
      content: `There's no listener with cooldown with ID=\`${listenerId}\`!`,
      ephemeral: true,
    });
    return;
  }

  if (!listener.cooldown) {
    listener.cooldown = new DynamicCooldownManager();
  }

  const type = options.getString("type", true) as CooldownSpec["type"];

  if (type === "disabled") {
    listener.cooldown.update({ type: "disabled" });
    await interaction.reply({
      content: `Disabled cooldown for **${listenerId}**!`,
      ephemeral: !broadcast,
    });
    return;
  }

  const seconds = options.getNumber("seconds");
  if (seconds === null) {
    await interaction.reply({
      content: "Specify a value for the default cooldown duration!",
      ephemeral: true,
    });
    return;
  }

  switch (type) {
    case "global":
      listener.cooldown.update({ type, seconds });
      break;
    case "user":
    case "channel":
      listener.cooldown.update({ type, defaultSeconds: seconds });
      break;
  }

  const response = `Updated **${listenerId}** cooldown spec:\n` +
    toBulletedList([
      `Type: \`${type}\``,
      `Default duration: ${formatHoursMinsSeconds(seconds)}`,
    ]);
  await interaction.reply({ content: response, ephemeral: !broadcast });
});

const setCooldownSpec = setCooldown.toSpec();
export default setCooldownSpec;
