import { GuildMember, Message } from "discord.js";

import getLogger from "../logger";
import { addDateSeconds } from "../utils/dates.utils";
import { replySilently } from "../utils/interaction.utils";
import { formatContext } from "../utils/logging.utils";
import uids from "../utils/uids.utils";

const log = getLogger(__filename);

export class LukeService {
  public static DAD_COOLDOWN_SEC = 600;
  public static DEEZ_COOLDOWN_SEC = 600;
  public static INIT_MEOW_CHANCE = 0.05;

  private dadCooldowns = new Map<string, Date>();
  private deezCooldown = new Date(0);
  private meowChance = LukeService.INIT_MEOW_CHANCE;

  constructor() {
    if (uids.LUKE === undefined) {
      log.warn("luke UID not found.");
    }
  }

  public async processMessage(message: Message) {
    await this.processDadJoke(message);
    await this.processDeez(message);
    await this.processMeow(message);
  }

  public getMeowChance(): number {
    return this.meowChance;
  }

  public setMeowChance(probability: number) {
    this.meowChance = probability;
  }

  private async processDadJoke(message: Message) {
    // Use .member instead of .author so .displayName works as expected.
    const author = message.member as GuildMember;

    const cooldown = this.dadCooldowns.get(author.id);
    const now = new Date();
    if (cooldown !== undefined && cooldown >= now)
      return;

    const TRIGGER_REGEXP = /^i(?:['’]| a)?m(\s+not)?\s+(.+)/i;
    const matches = TRIGGER_REGEXP.exec(message.content);
    if (matches === null)
      return;
    const [_, notPresent, captured] = matches;

    let response: string;
    if (notPresent) {
      response = (
        `Of course you're not ${captured}, you're ${author.displayName}!`
      )
    } else {
      response = `Hi ${captured}, I'm ${message.client.user.displayName}!`;
    }

    await replySilently(message, response);
    const newCooldown = addDateSeconds(now, LukeService.DAD_COOLDOWN_SEC);
    this.dadCooldowns.set(author.id, newCooldown);

    const context = formatContext(message);
    log.debug(
      `${context}: replied with Dad joke ` +
      `(${notPresent ? "negative" : "affirmative"} version).`
    );
  }

  private async processDeez(message: Message) {
    if (message.content.toLowerCase() !== "deez")
      return;

    const now = new Date();
    if (this.deezCooldown >= now)
      return;

    await replySilently(message, "deez");
    this.deezCooldown = addDateSeconds(now, LukeService.DEEZ_COOLDOWN_SEC);

    const context = formatContext(message);
    log.debug(`${context}: replied with deez.`);
  }

  private async processMeow(message: Message) {
    if (message.author.id !== uids.LUKE)
      return;
    const willMeow = Math.random() < this.meowChance;
    if (willMeow) {
      await replySilently(message, "meow meow");
      const context = formatContext(message);
      log.debug(`${context}: meowed at Luke.`);
    }
  }
};

export default new LukeService();
