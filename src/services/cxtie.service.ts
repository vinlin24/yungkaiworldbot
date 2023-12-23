import { Message } from "discord.js";
import getLogger from "../logger";
import { addDateSeconds } from "../utils/dates.utils";
import { replySilently } from "../utils/interaction.utils";
import { formatContext } from "../utils/logging.utils";
import uids from "../utils/uids.utils";

const log = getLogger(__filename);

export class CxtieService {
  public static SNIFFS_COOLDOWN_SEC = 600;

  private sniffsCooldown = new Date(0);

  constructor() {
    if (uids.CXTIE === undefined) {
      log.warn("cxtie UID not found.");
    }
  }

  public processSniffs = async (message: Message) => {
    // NOTE: Crude but should do the job.
    const sniffsWithPossibleMarkdown = /^(?:[*_`|~]*|#+ )sniffs?[*_`|~]*$/i;
    if (!message.content.match(sniffsWithPossibleMarkdown))
      return;
    const now = new Date();
    if (this.sniffsCooldown < now) {
      await replySilently(message, message.content);
      const cooldown = addDateSeconds(now, CxtieService.SNIFFS_COOLDOWN_SEC);
      this.sniffsCooldown = cooldown;
      const context = formatContext(message);
      log.info(`${context}: echoed sniffs.`);
    }
  }
}

export default new CxtieService();
