import getLogger from "../../logger";
import { contentMatching } from "../../middleware/filters.middleware";
import { Controller, MessageListener } from "../../types/controller.types";
import { reactCustomEmoji } from "../../utils/interaction.utils";
import uids from "../../utils/uids.utils";

const log = getLogger(__filename);

const NEKO_UWU_EMOJI_NAME = "7482uwucat1";

const onPookie = new MessageListener("pookie");

onPookie.filter(contentMatching(/^pookie$/i));

onPookie.cooldown.set({
  type: "user",
  defaultSeconds: 300,
});

// TODO: there's gotta be a better way to do this lol.
if (uids.WAV === undefined) {
  log.warning("wav UID not found.");
} else {
  onPookie.cooldown.setBypass(true, uids.WAV);
}
if (uids.COFFEE === undefined) {
  log.warning("coffee UID not found.");
} else {
  onPookie.cooldown.setBypass(true, uids.COFFEE);
}

onPookie.execute(async (message) => {
  await reactCustomEmoji(message, NEKO_UWU_EMOJI_NAME);
});

const controller: Controller = {
  name: "wav",
  commands: [],
  listeners: [onPookie],
};

export default controller;
