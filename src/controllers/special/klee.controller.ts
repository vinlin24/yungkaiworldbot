import { Events } from "discord.js";

import { channelPollutionAllowed, ignoreBots } from "../../middleware/filters.middleware";
import kleeService from "../../services/klee.service";
import { Controller, Listener } from "../../types/controller.types";
import uids from "../../utils/uids.utils";

const onDab = new Listener<Events.MessageCreate>({
  name: Events.MessageCreate,
});

onDab.filter(ignoreBots);
onDab.filter(message => // Klee's dab can bypass channel restrictions.
  message.author.id === uids.KLEE || channelPollutionAllowed(message)
);
onDab.filter(message =>
  message.content.toLowerCase() === "dab"
);

onDab.execute(kleeService.dabBack);

const controller: Controller = {
  name: "klee",
  commands: [],
  listeners: [onDab],
};

export default controller;
