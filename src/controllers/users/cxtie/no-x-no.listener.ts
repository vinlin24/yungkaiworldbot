import {
  CooldownManager,
  useCooldown,
} from "../../../middleware/cooldown.middleware";
import {
  channelPollutionAllowed,
  contentMatching,
} from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { replySilently } from "../../../utils/interaction.utils";

const noXNo = new MessageListenerBuilder().setId("no-x-no");

noXNo.filter(channelPollutionAllowed);
noXNo.filter(contentMatching(/^no (.+) no$/i));
noXNo.execute(async (message) => {
  const { displayName } = message.author;
  await replySilently(message, `no ${displayName} no`);
});

const cooldown = new CooldownManager({
  type: "user",
  defaultSeconds: 60,
});

noXNo.filter(useCooldown(cooldown));
noXNo.saveCooldown(cooldown);

const noXNoSpec = noXNo.toSpec();
export default noXNoSpec;
