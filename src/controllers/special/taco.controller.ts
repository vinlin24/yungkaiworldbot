import getLogger from "../../logger";
import { messageFrom } from "../../middleware/filters.middleware";
import { Controller, MessageListener } from "../../types/controller.types";
import { replySilently } from "../../utils/interaction.utils";
import { formatContext } from "../../utils/logging.utils";

const log = getLogger(__filename);

/** Mapping from name on character card to string to use when appreciating. */
const NAMES_TO_APPRECIATE = new Map<string, string>([
  ["Atsuko Kagari", "akko"],
  ["Saber", "saber"],
]);

const onAppreciatedChar = new MessageListener("mudae-appreciation");

onAppreciatedChar.filter(messageFrom("MUDAE"));
onAppreciatedChar.filter(message => message.embeds.length > 0);
onAppreciatedChar.execute(async (message) => {
  const [embed] = message.embeds;
  const charName = embed.author?.name;
  if (charName === undefined) return false;
  const appreciateName = NAMES_TO_APPRECIATE.get(charName);
  if (appreciateName === undefined) return false;
  await replySilently(message, `daily ${appreciateName} appreciation`);
  log.debug(`${formatContext(message)}: appreciated ${appreciateName}.`);
  return true;
});

const controller: Controller = {
  name: "taco",
  commands: [],
  listeners: [onAppreciatedChar],
};

export default controller;
