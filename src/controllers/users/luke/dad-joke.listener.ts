
import { CooldownManager, useCooldown } from "../../../middleware/cooldown.middleware";
import {
  channelPollutionAllowed
} from "../../../middleware/filters.middleware";
import lukeService from "../../../services/luke.service";
import { MessageListenerBuilder } from "../../../types/listener.types";

const dadJoker = new MessageListenerBuilder().setId("dad-joke");

dadJoker.filter(channelPollutionAllowed);
dadJoker.execute(lukeService.processDadJoke);

const cooldown = new CooldownManager({ type: "user", defaultSeconds: 600 });
dadJoker.filter(useCooldown(cooldown));
dadJoker.saveCooldown(cooldown);

const dadJokeSpec = dadJoker.toSpec();
export default dadJokeSpec;
