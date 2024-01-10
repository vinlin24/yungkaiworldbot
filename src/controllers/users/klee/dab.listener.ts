import config from "../../../config";
import getLogger from "../../../logger";
import {
  CooldownManager,
  useCooldown,
} from "../../../middleware/cooldown.middleware";
import {
  channelPollutionAllowedOrBypass,
  contentMatching,
  ignoreBots,
} from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { GUILD_EMOJIS } from "../../../utils/emojis.utils";
import { replySilently } from "../../../utils/interaction.utils";
import { formatContext } from "../../../utils/logging.utils";

const log = getLogger(__filename);

const onDab = new MessageListenerBuilder().setId("dab");

onDab.filter(ignoreBots);
onDab.filter(contentMatching(/^dab$/i));
onDab.filter({
  predicate: channelPollutionAllowedOrBypass(config.KLEE_UID),
  onFail: async (message) => await message.react(GUILD_EMOJIS.NEKO_L),
});

onDab.execute(async (message) => {
  await replySilently(message, "dab");
  log.debug(`${formatContext(message)}: dabbed back.`);
});

const cooldown = new CooldownManager({
  type: "global",
  seconds: 600,
  bypassers: [config.KLEE_UID],
  async onCooldown(message) {
    await message.react(GUILD_EMOJIS.NEKO_L);
  },
});

onDab.filter(useCooldown(cooldown));
onDab.saveCooldown(cooldown);

const onDabSpec = onDab.toSpec();
export default onDabSpec;
