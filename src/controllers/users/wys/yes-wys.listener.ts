import env from "../../../config";
import {
  channelPollutionAllowed,
  messageFrom,
  randomly,
} from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { replySilentlyWith } from "../../../utils/interaction.utils";

const yesWys = new MessageListenerBuilder().setId("yes-wys");

yesWys.filter(channelPollutionAllowed);
yesWys.filter(messageFrom(env.WYS_UID));
yesWys.filter(randomly(0.02));
yesWys.execute(replySilentlyWith("yes wys"));

const yesWysSpec = yesWys.toSpec();
export default yesWysSpec;
