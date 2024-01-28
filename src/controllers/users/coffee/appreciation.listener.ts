import env from "../../../config";
import { containsCustomEmoji } from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { GUILD_EMOJIS } from "../../../utils/emojis.utils";
import { replySilentlyWith } from "../../../utils/interaction.utils";

// TODO: It may be nice to start merging related features into one listener
// instead of having separate ones for each user.

const coffeeAppreciation = new MessageListenerBuilder()
  .setId("coffee-appreciation");

coffeeAppreciation.filter(containsCustomEmoji(GUILD_EMOJIS.KOFI));
coffeeAppreciation.execute(replySilentlyWith("daily kofi appreciation"));
coffeeAppreciation.cooldown({
  type: "global",
  seconds: 300,
  bypassers: [env.COFFEE_UID],
});

const coffeeAppreciationSpec = coffeeAppreciation.toSpec();
export default coffeeAppreciationSpec;
