import { Message } from "discord.js";
import getLogger from "../logger";
import { formatContext } from "../utils/logging.utils";
import { parseCustomEmojis } from "../utils/markdown.utils";

const SUP_EMOJI_ID = "1171056612761403413"
const SLAY_EMOJI_ID = "1176908139896000623";

const log = getLogger(__filename);

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
