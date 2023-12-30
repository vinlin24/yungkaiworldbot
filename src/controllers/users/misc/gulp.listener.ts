import {
  CooldownManager,
  useCooldown,
} from "../../../middleware/cooldown.middleware";
import {
  contentMatching,
  messageFrom,
} from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { replySilentlyWith } from "../../../utils/interaction.utils";

const onGulp = new MessageListenerBuilder().setId("gulp");

onGulp.filter(messageFrom("BUNNY"));
onGulp.filter(contentMatching(/^gulp$/i));
onGulp.execute(replySilentlyWith("gulp"));

const cooldown = new CooldownManager({ type: "global", seconds: 600 });
onGulp.filter(useCooldown(cooldown));
onGulp.saveCooldown(cooldown);

const onGulpSpec = onGulp.toSpec();
export default onGulpSpec;
