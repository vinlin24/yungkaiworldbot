import { Events } from "discord.js";

import { messageFrom } from "../../middleware/filters.middleware";
import cxtieService from "../../services/cxtie.service";
import { Controller, Listener } from "../../types/controller.types";

const onMessage = new Listener<Events.MessageCreate>({
  name: Events.MessageCreate,
});

onMessage.filter(messageFrom("CXTIE"));
onMessage.execute(cxtieService.processSniffs);

const controller: Controller = {
  name: "cxtie",
  commands: [],
  listeners: [onMessage],
};

export default controller;
