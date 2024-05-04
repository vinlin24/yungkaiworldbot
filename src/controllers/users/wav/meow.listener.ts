import getLogger from "../../../logger";
import { contentMatching } from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { replySilently } from "../../../utils/interaction.utils";
import { formatContext } from "../../../utils/logging.utils";

const log = getLogger(__filename);

const noMeow = new MessageListenerBuilder().setId("no-meow");

noMeow.filter(contentMatching(/^meow$/i));
noMeow.execute(async message => {
  await replySilently(message, "no");
  log.debug(`${formatContext(message)}: replied to meow with 'no'.`);
});
noMeow.cooldown({ type: "global", seconds: 600 });

const noMeowSpec = noMeow.toSpec();
export default noMeowSpec;
