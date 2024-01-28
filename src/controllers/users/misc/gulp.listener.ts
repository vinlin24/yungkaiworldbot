import env from "../../../config";
import {
  contentMatching,
  messageFrom,
} from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { replySilentlyWith } from "../../../utils/interaction.utils";

const onGulp = new MessageListenerBuilder().setId("gulp");

onGulp.filter(messageFrom(env.BUNNY_UID));
onGulp.filter(contentMatching(/^gulp$/i));
onGulp.execute(replySilentlyWith("gulp"));
onGulp.cooldown({ type: "global", seconds: 600 });

const onGulpSpec = onGulp.toSpec();
export default onGulpSpec;
