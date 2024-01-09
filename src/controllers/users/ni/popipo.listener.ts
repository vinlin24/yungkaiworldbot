import config from "../../../config";
import getLogger from "../../../logger";
import {
  CooldownManager,
  useCooldown,
} from "../../../middleware/cooldown.middleware";
import {
  channelPollutionAllowedOrBypass,
  contentMatching,
} from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { replySilently } from "../../../utils/interaction.utils";
import { randRange } from "../../../utils/math.utils";

const log = getLogger(__filename);

const onPopipo = new MessageListenerBuilder().setId("popipo");

onPopipo.filter(contentMatching(/popipo/i));
onPopipo.filter(channelPollutionAllowedOrBypass(config.NI_UID));

onPopipo.execute(async (message) => {
  const randomNum = randRange(2, 6);
  const response = "popi".repeat(randomNum) + "po";
  await replySilently(message, response);
});

const cooldown = new CooldownManager({
  type: "user",
  defaultSeconds: 60,
  overrides: new Map([[config.NI_UID, 0]]),
});

onPopipo.filter(useCooldown(cooldown));
onPopipo.saveCooldown(cooldown);

const onPopipoSpec = onPopipo.toSpec();
export default onPopipoSpec;
