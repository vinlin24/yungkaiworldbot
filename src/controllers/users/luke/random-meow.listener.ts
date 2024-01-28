import env from "../../../config";
import getLogger from "../../../logger";
import {
  channelPollutionAllowed,
  messageFrom,
  randomly,
} from "../../../middleware/filters.middleware";
import lukeService from "../../../services/luke.service";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { replySilently } from "../../../utils/interaction.utils";
import { formatContext } from "../../../utils/logging.utils";

const log = getLogger(__filename);

const randomMeower = new MessageListenerBuilder().setId("meow");

randomMeower.filter(channelPollutionAllowed);
randomMeower.filter(messageFrom(env.LUKE_UID));
randomMeower.filter(randomly(lukeService.getMeowChance));
randomMeower.execute(async (message) => {
  await replySilently(message, "meow meow");
  log.debug(`${formatContext(message)}: meowed at Luke.`);
});

const randomMeowerSpec = randomMeower.toSpec();
export default randomMeowerSpec;
