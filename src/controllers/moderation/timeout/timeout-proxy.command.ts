import {
  GuildMember,
  PermissionFlagsBits,
  SlashCommandBuilder,
  inlineCode,
} from "discord.js";

import getLogger from "../../../logger";
import {
  RoleLevel,
  checkPrivilege,
} from "../../../middleware/privilege.middleware";
import { CommandBuilder } from "../../../types/command.types";
import {
  durationToSeconds,
  formatHoursMinsSeconds,
} from "../../../utils/dates.utils";
import { replyWithGenericACK } from "../../../utils/interaction.utils";
import { formatContext } from "../../../utils/logging.utils";

const log = getLogger(__filename);

const timeoutProxy = new CommandBuilder();

timeoutProxy.define(new SlashCommandBuilder()
  .setName("timeout-proxy")
  .setDescription("Issue a timeout through this bot.")
  // NOTE: What appears as "Timeout Members" in the Discord GUI is the
  // MODERATE_MEMBERS permission name in the API.
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption(input => input
    .setName("user")
    .setDescription("Member to time out.")
    .setRequired(true),
  )
  .addStringOption(input => input
    .setName("duration")
    .setDescription(
      "Example: \"10 min\". Assumes minutes if units are omitted. " +
      "Defaults to 1 minute.",
    ),
  )
  .addStringOption(input => input
    .setName("reason")
    .setDescription("Reason (to be included in the audit log)."),
  ),
);

// In addition, make it so that only Alpha+ can use it. Otherwise, baby mods may
// be able to abuse this feature to evade the audit log, or something like that.
timeoutProxy.check(checkPrivilege(RoleLevel.ALPHA_MOD));
timeoutProxy.execute(async interaction => {
  const member = interaction.options.getMember("user") as GuildMember;
  const reason = interaction.options.getString("reason");

  const duration = interaction.options.getString("duration") ?? "1 min";
  const durationSeconds = durationToSeconds(duration, "minute");
  if (durationSeconds === null || durationSeconds <= 0) {
    await interaction.reply({
      content: `Invalid duration ${inlineCode(duration)}!`,
      ephemeral: true,
    });
    return false;
  }

  await member.timeout(durationSeconds * 1000, reason ?? undefined);
  log.info(
    `${formatContext(interaction)}: timed out @${member.user.username} ` +
    `for ${formatHoursMinsSeconds(durationSeconds)} ` +
    `with reason: ${reason ?? "(none given)"}`,
  );

  await replyWithGenericACK(interaction, { ephemeral: true }); // Stealth :)
  return true;
});

const timeoutProxySpec = timeoutProxy.toSpec();
export default timeoutProxySpec;
