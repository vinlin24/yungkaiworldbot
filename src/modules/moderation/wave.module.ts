import { Events, GuildTextBasedChannel } from "discord.js";
import log from "../../logger";
import { Listener, ModuleSpec } from "../../types/module.types";
import { formatContext } from "../../utils/logging.utils";

const onIntroduction = new Listener<Events.MessageCreate>({
  name: Events.MessageCreate,
});

// TODO: This is probably worth its own named middleware, or straight-up just
// enforced at the event handler dispatch level.
onIntroduction.filter(message => !message.author.bot);

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

const spec: ModuleSpec = {
  name: "wave",
  commands: [],
  listeners: [onIntroduction],
};

export default spec;
