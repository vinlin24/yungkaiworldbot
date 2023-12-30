import getLogger from "../../logger";
import { CooldownManager, useCooldown } from "../../middleware/cooldown.middleware";
import { contentMatching } from "../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../types/listener.types";
import { GUILD_EMOJIS } from "../../utils/emojis.utils";
import { reactCustomEmoji } from "../../utils/interaction.utils";
import uids from "../../utils/uids.utils";

const log = getLogger(__filename);

const onPookie = new MessageListenerBuilder().setId("pookie");

onPookie.filter(contentMatching(/^pookie$/i));
onPookie.execute(async (message) => {
  await reactCustomEmoji(message, GUILD_EMOJIS.NEKO_UWU);
});

const cooldown = new CooldownManager({ type: "user", defaultSeconds: 300 });
// TODO: there's gotta be a better way to do this lol.
if (uids.WAV === undefined) {
  log.warning("wav UID not found.");
} else {
  cooldown.setBypass(true, uids.WAV);
}
if (uids.COFFEE === undefined) {
  log.warning("coffee UID not found.");
} else {
  cooldown.setBypass(true, uids.COFFEE);
}
onPookie.filter(useCooldown(cooldown));
onPookie.saveCooldown(cooldown);

const onPookieSpec = onPookie.toSpec();
export default onPookieSpec;
