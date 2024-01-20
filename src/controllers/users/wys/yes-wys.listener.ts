import config from "../../../config";
import { messageFrom, randomly } from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { replySilentlyWith } from "../../../utils/interaction.utils";

const yesWys = new MessageListenerBuilder().setId("yes-wys");

yesWys.filter(messageFrom(config.WYS_UID));
yesWys.filter(randomly(0.05));
yesWys.execute(replySilentlyWith("yes wys"));

const yesWysSpec = yesWys.toSpec();
export default yesWysSpec;
