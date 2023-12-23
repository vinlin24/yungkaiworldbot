import { Message } from "discord.js";
import getLogger from "../logger";
import { addDateSeconds } from "../utils/dates.utils";
import { replySilently } from "../utils/interaction.utils";
import { formatContext } from "../utils/logging.utils";
import uids from "../utils/uids.utils";

const log = getLogger(__filename);

export class KleeService {
  public static DAB_COOLDOWN_SEC = 600;

  private dabCooldown = new Date(0);

  constructor() {
    if (uids.KLEE === undefined) {
      log.warn("klee UID not found.");
    }
  }

  public dabBack = async (message: Message) => {
    const context = formatContext(message);

    // Klee can bypass cooldown.
    if (message.author.id === uids.KLEE) {
      await replySilently(message, "dab");
      log.debug(`${context}: replied with dab (bypassed cooldown).`)
      return; // Independent from ongoing cooldown.
    }

    const now = new Date();
    if (this.dabCooldown >= now)
      return;
    await replySilently(message, "dab");
    this.dabCooldown = addDateSeconds(now, KleeService.DAB_COOLDOWN_SEC);
    log.debug(`${context}: replied with dab.`);
  }
}

export default new KleeService();
