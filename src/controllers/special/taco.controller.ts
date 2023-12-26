import getLogger from "../../logger";
import { messageFrom } from "../../middleware/filters.middleware";
import { Controller, MessageListener } from "../../types/controller.types";
import { replySilently } from "../../utils/interaction.utils";
import { formatContext } from "../../utils/logging.utils";

const log = getLogger(__filename);

const onAkko = new MessageListener("akko");

onAkko.filter(messageFrom("MUDAE"));
onAkko.filter(message => {
  if (message.embeds.length === 0) return false;
  const [embed] = message.embeds;
  return embed.author?.name === "Atsuko Kagari";
});
onAkko.execute(async (message) => {
  await replySilently(message, "daily akko appreciation");
  log.debug(`${formatContext(message)}: appreciated Akko.`);
});

const controller: Controller = {
  name: "taco",
  commands: [],
  listeners: [onAkko],
};

export default controller;
