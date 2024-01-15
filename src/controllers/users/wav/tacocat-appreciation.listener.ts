import config from "../../../config";
import {
  contentMatching,
  messageFrom,
} from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { replySilentlyWith } from "../../../utils/interaction.utils";

const tacocatAppreciation = new MessageListenerBuilder()
  .setId("tacocat-appreciation");

tacocatAppreciation.filter(messageFrom(config.WAV_UID));
tacocatAppreciation.filter(contentMatching(/^\$im tacocat$/i));
tacocatAppreciation.execute(replySilentlyWith("daily tacocat appreciation"));

const tacocatAppreciationSpec = tacocatAppreciation.toSpec();
export default tacocatAppreciationSpec;
