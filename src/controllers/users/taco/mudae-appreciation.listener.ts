import { Embed } from "discord.js";

import config from "../../../config";
import getLogger from "../../../logger";
import { messageFrom } from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { replySilently } from "../../../utils/interaction.utils";
import { formatContext } from "../../../utils/logging.utils";

const log = getLogger(__filename);

/** Mapping from name on character card to string to use when appreciating. */
const NAMES_TO_APPRECIATE = new Map<string, string>([
  ["Atsuko Kagari", "akko"],  // Taco.
  ["Saber", "saber"],         // Luke.
  ["Hua Cheng", "hua cheng"], // Coffee.
  ["Nana Osaki", "nana"],     // Coffee.
]);

const onAppreciatedChar = new MessageListenerBuilder()
  .setId("mudae-appreciation");

onAppreciatedChar.filter(messageFrom(config.MUDAE_UID));
onAppreciatedChar.execute(async (message) => {
  const embed: Embed | undefined = message.embeds[0];
  const charName = embed?.author?.name;
  if (charName === undefined) return false;

  const appreciateName = NAMES_TO_APPRECIATE.get(charName);
  if (appreciateName === undefined) return false;

  await replySilently(message, `daily ${appreciateName} appreciation`);
  log.debug(`${formatContext(message)}: appreciated ${appreciateName}.`);
  return true;
});

const onAppreciatedCharSpec = onAppreciatedChar.toSpec();
export default onAppreciatedCharSpec;
