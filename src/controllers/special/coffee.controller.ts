import { Events } from "discord.js";
import getLogger from "../../logger";
import { ignoreBots } from "../../middleware/filters.middleware";
import coffeeService from "../../services/coffee.service";
import { Controller, Listener } from "../../types/controller.types";

const log = getLogger(__filename);

const onMessage = new Listener<Events.MessageCreate>({
  name: Events.MessageCreate,
});

onMessage.filter(ignoreBots);

onMessage.execute(async (message) => {
  await coffeeService.processMessage(message);
});

const controller: Controller = {
  name: "coffee",
  commands: [],
  listeners: [onMessage],
};

export default controller;
