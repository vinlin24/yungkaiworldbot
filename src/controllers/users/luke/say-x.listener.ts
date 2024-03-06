import {
  channelPollutionAllowed,
} from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { replySilently } from "../../../utils/interaction.utils";

const sayX = new MessageListenerBuilder().setId("say-x");

sayX.filter(channelPollutionAllowed);
sayX.execute(async message => {
  const regexp = /^say\s+(.+)/i;
  const match = message.content.match(regexp);
  if (!match) return false;
  const [, stringToEcho] = match;
  await replySilently(message, stringToEcho);
  return true;
});
sayX.cooldown({ type: "user", defaultSeconds: 600 });

const sayXSpec = sayX.toSpec();
export default sayXSpec;
