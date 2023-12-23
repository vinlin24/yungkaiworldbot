import { Events, GuildTextBasedChannel } from "discord.js";

import log from "../../logger";
import { ignoreBots } from "../../middleware/filters.middleware";
import { Controller, Listener } from "../../types/controller.types";
import { formatContext } from "../../utils/logging.utils";

const onIntroduction = new Listener<Events.MessageCreate>({
  name: Events.MessageCreate,
});

onIntroduction.filter(ignoreBots);

onIntroduction.filter(message => {
  const channel = message.channel as GuildTextBasedChannel;
  return channel.name.includes("introductions");
});

onIntroduction.execute(async (message) => {
  // Assume that anything that's not a reply is an introduction.
  if (message.reference)
    return;
  await message.react("👋");
  const context = formatContext(message);
  log.info(`${context}: waved at user's introduction.`);
});

const spec: Controller = {
  name: "wave",
  commands: [],
  listeners: [onIntroduction],
};

export default spec;
