import env from "../../../config";
import getLogger from "../../../logger";
import {
  channelPollutionAllowedOrBypass,
  contentMatching,
} from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { replySilently } from "../../../utils/interaction.utils";
import { formatContext } from "../../../utils/logging.utils";
import { randRange } from "../../../utils/math.utils";

const log = getLogger(__filename);

const onPopipo = new MessageListenerBuilder().setId("popipo");

onPopipo.filter(contentMatching(/(popipo|뽀삐뽀)/i));
onPopipo.filter(channelPollutionAllowedOrBypass(env.NI_UID));

onPopipo.execute(async (message) => {
  const randomNum = randRange(2, 6);
  const response = "popi".repeat(randomNum) + "po";
  await replySilently(message, response);
  log.debug(`${formatContext(message)}: replied with '${response}'.`);
});

onPopipo.cooldown({
  type: "user",
  defaultSeconds: 60,
  overrides: new Map([[env.NI_UID, 0]]),
});

const onPopipoSpec = onPopipo.toSpec();
export default onPopipoSpec;
