import { contentMatching } from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { GUILD_EMOJIS } from "../../../utils/emojis.utils";
import { reactWith } from "../../../utils/interaction.utils";

const tempbotAppreciation = new MessageListenerBuilder()
  .setId("tempbot-appreciation");

tempbotAppreciation.filter(contentMatching(/\btempbot appreciation\b/i));
tempbotAppreciation.execute(reactWith(GUILD_EMOJIS.NEKO_UWU));

const tempbotAppreciationSpec = tempbotAppreciation.toSpec();
export default tempbotAppreciationSpec;
