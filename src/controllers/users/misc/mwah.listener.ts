import config from "../../../config";
import {
  contentMatching,
  messageFrom,
} from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { replySilentlyWith } from "../../../utils/interaction.utils";

const onMwah = new MessageListenerBuilder().setId("mwah");

onMwah.filter(messageFrom(config.J_UID));
onMwah.filter(contentMatching(/^mwah$/i));
onMwah.execute(replySilentlyWith("mwah"));
onMwah.cooldown({ type: "global", seconds: 600 });

const onMwahSpec = onMwah.toSpec();
export default onMwahSpec;
