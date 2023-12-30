import { Events, GuildTextBasedChannel } from "discord.js";

import getLogger from "../../logger";
import { ignoreBots } from "../../middleware/filters.middleware";
import { ListenerExecuteFunction, ListenerFilterFunction, ListenerSpec } from "../../types/listener.types";
import { formatContext } from "../../utils/logging.utils";

const log = getLogger(__filename);

const execute: ListenerExecuteFunction<Events.MessageCreate> =
  async function (message) {
    // Assume that anything that's not a reply is an introduction.
    if (message.reference) return false;
    await message.react("👋");
    const context = formatContext(message);
    log.info(`${context}: waved at user's introduction.`);
    return true;
  };

const inIntroductionsChannel: ListenerFilterFunction<Events.MessageCreate>
  = function (message) {
    const channel = message.channel as GuildTextBasedChannel;
    return channel.name.includes("introductions");
  };

const waveSpec: ListenerSpec<Events.MessageCreate> = {
  type: Events.MessageCreate,
  id: "introduction-wave",
  execute,
  filters: [ignoreBots, inIntroductionsChannel],
};

export default waveSpec;
