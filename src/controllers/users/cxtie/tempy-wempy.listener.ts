import { GuildTextBasedChannel } from "discord.js";

import getLogger from "../../../logger";
import {
  contentMatching,
  isPollutionImmuneChannel,
} from "../../../middleware/filters.middleware";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { replySilently } from "../../../utils/interaction.utils";
import { formatContext } from "../../../utils/logging.utils";

const log = getLogger(__filename);

const onTempyWempy = new MessageListenerBuilder().setId("tempy-wempy");

onTempyWempy.filter(contentMatching(/tempy wempy/i));
onTempyWempy.execute(async (message) => {
  const channel = message.channel as GuildTextBasedChannel;
  let reacted: boolean;
  if (isPollutionImmuneChannel(channel)) {
    await message.react("🇸");
    await message.react("🇹");
    await message.react("🇴");
    await message.react("🇵");
    reacted = true;
  }
  else {
    await replySilently(message, "Stop calling me that.");
    reacted = false;
  }
  log.debug(
    `${formatContext(message)}: protested being called "tempy wempy" ` +
    `(${reacted ? "reacted" : "replied"}).`,
  );
});
onTempyWempy.cooldown({ type: "global", seconds: 60 });

const onTempyWempySpec = onTempyWempy.toSpec();
export default onTempyWempySpec;
