
import getLogger from "../../logger";
import {
  channelPollutionAllowed,
  contentMatching,
  ignoreBots,
} from "../../middleware/filters.middleware";
import { Controller, MessageListener } from "../../types/controller.types";
import { reactCustomEmoji, replySilently } from "../../utils/interaction.utils";
import { formatContext } from "../../utils/logging.utils";
import uids from "../../utils/uids.utils";

const log = getLogger(__filename);

const NEKO_L_EMOJI_NAME = "nekocatL";

const onDab = new MessageListener("dab");

onDab.cooldown.set({
  type: "global",
  seconds: 600,
  async onCooldown(message) {
    await reactCustomEmoji(message, NEKO_L_EMOJI_NAME);
  },
});

if (uids.KLEE === undefined) {
  log.warning("klee UID not found.");
} else {
  onDab.cooldown.setBypass(true, uids.KLEE);
}

onDab.filter(ignoreBots);
onDab.filter(contentMatching(/^dab$/i));
onDab.filter({
  // Klee's dab can bypass channel restrictions.
  predicate: (message) =>
    message.author.id === uids.KLEE || channelPollutionAllowed(message),
  onFail: async (message) =>
    await reactCustomEmoji(message, NEKO_L_EMOJI_NAME)
});

onDab.execute(async (message) => {
  await replySilently(message, "dab");
  log.debug(`${formatContext(message)}: dabbed back.`);
});

const controller: Controller = {
  name: "klee",
  commands: [],
  listeners: [onDab],
};

export default controller;
