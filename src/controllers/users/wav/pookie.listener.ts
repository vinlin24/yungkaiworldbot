import config from "../../../config";
import getLogger from "../../../logger";
import {
  CooldownManager,
  useCooldown,
} from "../../../middleware/cooldown.middleware";
import { contentMatching } from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { GUILD_EMOJIS } from "../../../utils/emojis.utils";
import { formatContext } from "../../../utils/logging.utils";

const log = getLogger(__filename);

const onPookie = new MessageListenerBuilder().setId("pookie");

onPookie.filter(contentMatching(/^pookie$/i));
onPookie.execute(async (message) => {
  await message.react(GUILD_EMOJIS.NEKO_UWU);
  log.debug(`${formatContext(message)}: reacted to pookie.`);
});

const cooldown = new CooldownManager({
  type: "user",
  defaultSeconds: 300,
  overrides: new Map([
    [config.WAV_UID, 0],
    [config.COFFEE_UID, 0],
  ]),
});

onPookie.filter(useCooldown(cooldown));
onPookie.saveCooldown(cooldown);

const onPookieSpec = onPookie.toSpec();
export default onPookieSpec;
