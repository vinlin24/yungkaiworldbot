import path from "node:path";

import { MessageFlags } from "discord.js";

import config from "../../../config";
import {
  contentMatching,
  messageFrom,
} from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";

// TODO: Make assets path a global configuration constant.
const LEE_GWAN_HEE_PATH = path.join(
  __dirname, "..", "..", "..", "assets", "lee-gwan-hee.jpg",
);

const LEE_GWAN_HEE_REGEXP = /lee ?[gk]wan[ -]?hee/i;

const onLeeGwanHee = new MessageListenerBuilder().setId("lee-gwan-hee");

onLeeGwanHee.filter(messageFrom(config.KAI_UID));
onLeeGwanHee.filter(contentMatching(LEE_GWAN_HEE_REGEXP));
onLeeGwanHee.execute(async (interaction) => {
  await interaction.reply({
    files: [LEE_GWAN_HEE_PATH],
    allowedMentions: { parse: [] },
    flags: MessageFlags.SuppressNotifications,
  });
});

const onLeeGwanHeeSpec = onLeeGwanHee.toSpec();
export default onLeeGwanHeeSpec;
