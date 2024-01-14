import getLogger from "../../../logger";
import { contentMatching } from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { replySilently } from "../../../utils/interaction.utils";
import { formatContext } from "../../../utils/logging.utils";
import { randRange } from "../../../utils/math.utils";

const log = getLogger(__filename);

export const YOUR_MOM_RESPONSES = [
  "Wow you're so funny!",
  "Haha! You got the whole squad laughing!",
  "no u",
  "We have a comedian here!",
  "ok buddy",
  "When I'm in an unoriginal joke contest and my opponent is ^",
] as const;

const yourMom = new MessageListenerBuilder().setId("your-mom");

yourMom.filter(contentMatching(/^(your|ur) ?(mom|mum)[.~!?-]*$/i));
yourMom.execute(async (message) => {
  const randIndex = randRange(0, YOUR_MOM_RESPONSES.length - 1);
  const reply = YOUR_MOM_RESPONSES[randIndex];
  await replySilently(message, reply);
  log.debug(`${formatContext(message)}: mocked your mom joke with ${reply}.`);
});
yourMom.cooldown({ type: "global", seconds: 600 });

const yourMomSpec = yourMom.toSpec();
export default yourMomSpec;
