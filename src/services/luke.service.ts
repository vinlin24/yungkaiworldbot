import { GuildMember, Message } from "discord.js";

import getLogger from "../logger";
import { replySilently } from "../utils/interaction.utils";
import { formatContext } from "../utils/logging.utils";

const log = getLogger(__filename);

export class LukeService {
  public static readonly INIT_MEOW_CHANCE = 0.05;
  private meowChance = LukeService.INIT_MEOW_CHANCE;

  public getMeowChance = (): number => {
    return this.meowChance;
  }

  public setMeowChance = (probability: number): void => {
    this.meowChance = probability;
  }

  public processDadJoke = async (message: Message): Promise<boolean> => {
    // Use .member instead of .author so .displayName works as expected.
    const author = message.member as GuildMember;

    const TRIGGER_REGEXP = /^i(?:['’]| a)?m(\s+not)?\s+(.+)/i;
    const matches = TRIGGER_REGEXP.exec(message.content);
    if (matches === null) return false;
    const [_, notPresent, captured] = matches;

    let response: string;
    if (notPresent) {
      response = (
        `Of course you're not ${captured}, you're ${author.displayName}!`
      );
    } else {
      response = `Hi ${captured}, I'm ${message.client.user.displayName}!`;
    }

    await replySilently(message, response);
    log.debug(
      `${formatContext(message)}: replied with Dad joke ` +
      `(${notPresent ? "negative" : "affirmative"} version).`
    );
    return true;
  }
};

export default new LukeService();
