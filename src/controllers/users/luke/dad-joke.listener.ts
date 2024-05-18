import {
  authorHasBeenMemberFor,
  channelPollutionAllowed,
} from "../../../middleware/filters.middleware";
import lukeService from "../../../services/luke.service";
import { MessageListenerBuilder } from "../../../types/listener.types";

const dadJoker = new MessageListenerBuilder().setId("dad-joke");

// Don't weird out new members lol.
dadJoker.filter(authorHasBeenMemberFor(1, "day"));
dadJoker.filter(channelPollutionAllowed);
dadJoker.execute(lukeService.processDadJoke);
dadJoker.cooldown({ type: "user", defaultSeconds: 600 });

const dadJokeSpec = dadJoker.toSpec();
export default dadJokeSpec;
