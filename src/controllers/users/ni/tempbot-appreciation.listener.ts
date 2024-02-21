import { contentMatching } from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { GUILD_EMOJIS } from "../../../utils/emojis.utils";
import { reactWith } from "../../../utils/interaction.utils";

const tempbotAppreciation = new MessageListenerBuilder()
  .setId("tempbot-appreciation");

const regex = /\btempbot([*_]*ni[*_]*)? appreciation\b/i;

tempbotAppreciation.filter(contentMatching(regex));
tempbotAppreciation.execute(reactWith(GUILD_EMOJIS.NEKO_UWU));

const tempbotAppreciationSpec = tempbotAppreciation.toSpec();
export default tempbotAppreciationSpec;
