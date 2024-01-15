import { Events, GuildMember, Role, SlashCommandBuilder } from "discord.js";

import { BotClient } from "../../../bot/client";
import {
  RoleLevel,
  checkPrivilege,
} from "../../../middleware/privilege.middleware";
import { CommandBuilder } from "../../../types/command.types";
import { formatHoursMinsSeconds } from "../../../utils/dates.utils";
import { getAllMembers } from "../../../utils/iteration.utils";
import { addBroadcastOption } from "../../../utils/options.utils";
import { listenerIdAutocomplete } from "./cooldowns.autocomplete";

const overrideCooldown = new CommandBuilder();

const slashCommandDefinition = new SlashCommandBuilder()
  .setName("override-listener-cooldown")
  .setDescription("Set cooldown overrides for a message creation listener.")
  .addStringOption(input => input
    .setName("listener")
    .setDescription("Listener ID.")
    .setRequired(true)
    .setAutocomplete(true),
  )
  .addMentionableOption(input => input
    .setName("mentionable")
    // TODO: supporting roles mean that the underlying list of members with
    // overrides can easily explode in size, likely making the current
    // implementation of /cooldowns (which returns an unpaginated text
    // response) error out from exceeded message length limit.
    .setDescription("Member or role to set overrides for.")
    .setRequired(true),
  )
  .addNumberOption(input => input
    .setName("duration")
    .setDescription(
      "User-specific cooldown duration override " +
      "(in seconds) (USER type cooldown only).",
    )
    .setMinValue(0),
  )
  .addBooleanOption(input => input
    .setName("bypass")
    .setDescription("Allow this user to bypass cooldown duration."),
  );
addBroadcastOption(slashCommandDefinition);

overrideCooldown.define(slashCommandDefinition);

overrideCooldown.check(checkPrivilege(RoleLevel.DEV));

overrideCooldown.autocomplete(listenerIdAutocomplete);

overrideCooldown.execute(async (interaction) => {
  const { options } = interaction;
  const broadcast = options.getBoolean("broadcast") ?? false;
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

  const { cooldown } = listener;

  if (!cooldown || cooldown.type === "disabled") {
    await interaction.reply({
      content: `Cooldown for **${listenerId}** is currently disabled!`,
      ephemeral: true,
    });
    return;
  }

  const mentionable
    = options.getMentionable("mentionable", true) as GuildMember | Role;
  const members = getAllMembers(mentionable);

  const duration = options.getNumber("duration");
  const bypass = options.getBoolean("bypass");

  if (duration !== null && bypass !== null) {
    await interaction.reply({
      content: "Provide a duration or bypass value but not both!",
      ephemeral: true,
    });
    return;
  }

  if (duration !== null) {
    if (cooldown.type !== "user") {
      await interaction.reply({
        content: "`duration` is only compatible with `user` cooldown type.",
        ephemeral: true,
      });
      return;
    }
    for (const member of members) {cooldown.setDuration(duration, member.id);}
    await interaction.reply({
      content:
        `Set **${listenerId}** cooldown duration override for ` +
        `${mentionable}: ${formatHoursMinsSeconds(duration)}.`,
      ephemeral: !broadcast,
      // TODO: Maybe make a replySilently overload for interactions.
      allowedMentions: { parse: [] },
    });
    return;
  }

  if (bypass !== null) {
    for (const member of members) {cooldown.setBypass(bypass, member.id);}
    await interaction.reply({
      content:
        `${bypass ? "Enabled" : "Disabled"} **${listenerId}** bypass ` +
        `for ${mentionable}.`,
      ephemeral: !broadcast,
      allowedMentions: { parse: [] },
    });
    return;
  }

  await interaction.reply({
    content: "Missing argument(s)!",
    ephemeral: true,
  });
});

const overrideCooldownSpec = overrideCooldown.toSpec();
export default overrideCooldownSpec;
