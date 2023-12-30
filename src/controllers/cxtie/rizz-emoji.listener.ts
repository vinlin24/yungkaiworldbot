
import { messageFrom } from "../../middleware/filters.middleware";
import cxtieService from "../../services/cxtie.service";
import { MessageListenerBuilder } from "../../types/listener.types";
import { GUILD_EMOJIS } from "../../utils/emojis.utils";
import { reactCustomEmoji } from "../../utils/interaction.utils";

const onRizzEmoji = new MessageListenerBuilder().setId("rizz-emoji");

onRizzEmoji.filter(messageFrom("CXTIE"));
onRizzEmoji.filter(cxtieService.containsCringeEmojis);
onRizzEmoji.execute(async (message) => {
  return await reactCustomEmoji(message, GUILD_EMOJIS.NEKO_GUN);
});

export default onRizzEmoji.toSpec();
