import { Message } from "discord.js";

import log from "../logger";
import { addDateSeconds } from "../utils/dates.utils";
import { replySilently } from "../utils/interaction.utils";
import { formatContext } from "../utils/logging.utils";

// TODO: Wrong value at the moment. Also, move to another module maybe, and make
// it an environment variable?
const LUKE_UID = "4242424242";

export class LukeController {
  public static DAD_COOLDOWN_SEC = 600;
  public static DEEZ_COOLDOWN_SEC = 600;
  public static DAB_COOLDOWN_SEC = 600;
  public static INIT_MEOW_CHANCE = 0.05;

  private dadCooldowns = new Map<string, Date>();
  private deezCooldown = new Date(0);
  private dabCooldown = new Date(0);
  private meowChance = LukeController.INIT_MEOW_CHANCE;

  public async processMessage(message: Message) {
    if (message.author.bot)
      return;
    await this.processDadJoke(message);
    await this.processDeez(message);
    await this.processDab(message);
    await this.processMeow(message);
  }

  public getMeowChance(): number {
    return this.meowChance;
  }

  public setMeowChance(probability: number) {
    this.meowChance = probability;
  }

  private async processDadJoke(message: Message) {
    const { author } = message;
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
    const newCooldown = addDateSeconds(now, LukeController.DAD_COOLDOWN_SEC);
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
    this.deezCooldown = addDateSeconds(now, LukeController.DEEZ_COOLDOWN_SEC);

    const context = formatContext(message);
    log.debug(`${context}: replied with deez.`);
  }

  private async processDab(message: Message) {
    if (message.content.toLowerCase() !== "dab")
      return;

    const now = new Date();
    if (this.dabCooldown >= now)
      return;

    await replySilently(message, "dab");
    this.dabCooldown = addDateSeconds(now, LukeController.DAB_COOLDOWN_SEC);

    const context = formatContext(message);
    log.debug(`${context}: replied with dab.`);
  }

  private async processMeow(message: Message) {
    if (message.author.id !== LUKE_UID)
      return;
    const willMeow = Math.random() < this.meowChance;
    if (willMeow) {
      await replySilently(message, "meow meow");
      const context = formatContext(message);
      log.debug(`${context}: meowed at Luke.`);
    }
  }
};

export default new LukeController();
