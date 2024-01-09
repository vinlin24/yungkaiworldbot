import getLogger from "../../../logger";
import { messageFrom, randomly } from "../../../middleware/filters.middleware";
import cxtieService from "../../../services/cxtie.service";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { GUILD_EMOJIS } from "../../../utils/emojis.utils";
import { formatContext } from "../../../utils/logging.utils";

const log = getLogger(__filename);

const randomReacter = new MessageListenerBuilder().setId("anti-cxtie");

randomReacter.filter(messageFrom("CXTIE"));
randomReacter.filter(randomly(() => cxtieService.reactChance));
randomReacter.execute(async (message) => {
  await message.react(GUILD_EMOJIS.HMM);
  await message.react("⏲️");
  await message.react("❓");
  log.debug(`${formatContext(message)}: reacted with anti-Cxtie emojis.`);
});

const randomReacterSpec = randomReacter.toSpec();
export default randomReacterSpec;
