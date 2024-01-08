import { Message } from "discord.js";

import getLogger from "../logger";
import { parseCustomEmojis } from "../utils/emojis.utils";
import { formatContext } from "../utils/logging.utils";

const log = getLogger(__filename);

// NOTE: These emojis are from outside yung kai world so they are not part of
// our custom emojis mapping.
export const SUP_EMOJI_ID = "1171056612761403413"
export const SLAY_EMOJI_ID = "1176908139896000623";

export class CxtieService {
  public static INIT_TIMER_REACT_CHANCE = 0.05;
  private currentReactChance = CxtieService.INIT_TIMER_REACT_CHANCE;

  public get reactChance(): number { return this.currentReactChance; }
  public set reactChance(chance: number) { this.currentReactChance = chance; }

  public containsCringeEmojis = (message: Message): boolean => {
    const emojis = parseCustomEmojis(message.content);
    const containsCringe = emojis.some(e => {
      const isCringe = e.id === SUP_EMOJI_ID || e.id === SLAY_EMOJI_ID;
      if (isCringe) {
        const context = formatContext(message);
        log.debug(`${context}: detected cringe emoji :${e.name}:.`);
      }
      return isCringe;
    });
    return containsCringe;
  }
}

export default new CxtieService();
