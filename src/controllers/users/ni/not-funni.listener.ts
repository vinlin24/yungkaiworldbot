import _ from "lodash";

import env from "../../../config";
import getLogger from "../../../logger";
import {
  channelPollutionAllowed,
  contentMatching,
} from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { replySilently } from "../../../utils/interaction.utils";
import { formatContext } from "../../../utils/logging.utils";

const log = getLogger(__filename);

const notFunni = new MessageListenerBuilder().setId("not-funni");

notFunni.filter(channelPollutionAllowed);
notFunni.filter(contentMatching(/not funni/i));
notFunni.execute(async message => {
  const randNum = _.random(1, 5);
  const veri = "veri".repeat(randNum);
  const response = `this is ${veri} not funni`;
  await replySilently(message, response);
  log.info(`${formatContext(message)}: replied with '${response}'.`);
});
notFunni.cooldown({ type: "global", seconds: 60, bypassers: [env.NI_UID] });

const notFunniSpec = notFunni.toSpec();
export default notFunniSpec;
