import _ from "lodash";

import env from "../../../config";
import getLogger from "../../../logger";
import {
  channelPollutionAllowed,
  messageFrom,
  randomly,
} from "../../../middleware/filters.middleware";
import lukeService from "../../../services/luke.service";
import { MessageListenerBuilder } from "../../../types/listener.types";
import { replySilently } from "../../../utils/interaction.utils";
import { formatContext } from "../../../utils/logging.utils";

const log = getLogger(__filename);

/* eslint-disable max-len */

export const POSSIBLE_RESPONSES = [
  /* The raging cat one. */
  "https://tenor.com/view/cat-speech-bubble-cat-drinking-water-stupid-stupid-cat-gif-12327862702270255434",
  /* The one with the hand holding the cat up by its neck. */
  "https://tenor.com/view/cat-kitten-speech-bubble-speech-discord-gif-25192162",
  /* The one with the cat licking water in a sink. */
  "https://tenor.com/view/cat-speech-bubble-cat-drinking-water-stupid-stupid-cat-gif-12327862702270255434",
  /** Re:Zero Felix with gamer headset. */
  "https://tenor.com/view/text-bubble-gif-25667436",
  /* My sincerest reaction to the information you have provided me. */
  "https://tenor.com/view/my-honest-reaction-my-honest-reaction-meme-my-sincerest-reaction-my-reaction-to-that-information-my-reaction-to-that-information-meme-gif-25853013",
  /* The OG reply. */
  "meow meow",
] as const;

/* eslint-enable max-len */

const randomMeower = new MessageListenerBuilder().setId("meow");

randomMeower.filter(channelPollutionAllowed);
randomMeower.filter(messageFrom(env.LUKE_UID));
randomMeower.filter(randomly(lukeService.getMeowChance));
randomMeower.execute(async message => {
  const response = _.sample(POSSIBLE_RESPONSES)!;
  await replySilently(message, response);
  log.debug(`${formatContext(message)}: replied to Luke with '${response}'.`);
});

const randomMeowerSpec = randomMeower.toSpec();
export default randomMeowerSpec;
