import getLogger from "../../logger";
import { channelPollutionAllowed, contentMatching } from "../../middleware/filters.middleware";
import { Controller, MessageListener } from "../../types/controller.types";
import { replySilently } from "../../utils/interaction.utils";
import { formatContext } from "../../utils/logging.utils";

const log = getLogger(__filename);

const onDeez = new MessageListener("deez");

onDeez.filter(channelPollutionAllowed);
onDeez.filter(contentMatching(/^deez$/i));
onDeez.cooldown.set({
  type: "global",
  seconds: 600,
});
onDeez.execute(async (message) => {
  await replySilently(message, "deez");
  log.debug(`${formatContext(message)}: replied with deez.`);
});

const controller: Controller = {
  name: "deez",
  commands: [],
  listeners: [onDeez],
};

export default controller;
