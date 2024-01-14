import config from "../../../config";
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

const onMwah = new MessageListenerBuilder().setId("mwah");

onMwah.filter(messageFrom(config.J_UID));
onMwah.filter(contentMatching(/^mwah$/i));
onMwah.execute(replySilentlyWith("mwah"));

const cooldown = new CooldownManager({ type: "global", seconds: 600 });
onMwah.filter(useCooldown(cooldown));
onMwah.saveCooldown(cooldown);

const onMwahSpec = onMwah.toSpec();
export default onMwahSpec;
