
import getLogger from "../../logger";
import {
  channelPollutionAllowed,
  ignoreBots,
} from "../../middleware/filters.middleware";
import { Controller, MessageListener } from "../../types/controller.types";
import { replySilently } from "../../utils/interaction.utils";
import { formatContext } from "../../utils/logging.utils";
import uids from "../../utils/uids.utils";

const log = getLogger(__filename);

const onDab = new MessageListener();

onDab.cooldown({
  type: "dynamic",
  defaultSeconds: 600,
});

if (uids.KLEE === undefined) {
  log.warn("klee UID not found.");
} else {
  onDab.setCooldown(0, uids.KLEE); // Klee dab can bypass cooldown.
}

onDab.filter(ignoreBots);
onDab.filter(message => // Klee's dab can bypass channel restrictions.
  message.author.id === uids.KLEE || channelPollutionAllowed(message)
);
onDab.filter(message =>
  message.content.toLowerCase() === "dab"
);

onDab.execute(async (message) => {
  await replySilently(message, "dab");
  const context = formatContext(message);
  log.debug(`${context}: dabbed back.`);
});

const controller: Controller = {
  name: "klee",
  commands: [],
  listeners: [onDab],
};

export default controller;
