import {
  channelPollutionAllowed,
} from "../../../middleware/filters.middleware";
import lukeService from "../../../services/luke.service";
import { MessageListenerBuilder } from "../../../types/listener.types";

const dadJoker = new MessageListenerBuilder().setId("dad-joke");

dadJoker.filter(channelPollutionAllowed);
dadJoker.execute(lukeService.processDadJoke);
dadJoker.cooldown({ type: "user", defaultSeconds: 600 });

const dadJokeSpec = dadJoker.toSpec();
export default dadJokeSpec;
