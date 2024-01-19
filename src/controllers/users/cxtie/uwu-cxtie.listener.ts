import { contentMatching } from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { replySilentlyWith } from "../../../utils/interaction.utils";

const uwuCxtie = new MessageListenerBuilder().setId("uwu-cxtie");

uwuCxtie.filter(contentMatching(/uwu cxtie/i));
uwuCxtie.execute(replySilentlyWith("UWU CXTIE"));
uwuCxtie.cooldown({ type: "global", seconds: 60 });

const uwuCxtieSpec = uwuCxtie.toSpec();
export default uwuCxtieSpec;
