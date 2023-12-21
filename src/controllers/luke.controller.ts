import { GuildTextBasedChannel, Message } from "discord.js";

import config from "../config";
import log from "../logger";
import { addDateSeconds } from "../utils/dates.utils";
import { replySilently } from "../utils/interaction.utils";
import { formatContext } from "../utils/logging.utils";

const { LUKE_UID, KLEE_UID } = config;

export class LukeController {
  public static DAD_COOLDOWN_SEC = 600;
  public static DEEZ_COOLDOWN_SEC = 600;
  public static DAB_COOLDOWN_SEC = 600;
  public static INIT_MEOW_CHANCE = 0.05;

  private dadCooldowns = new Map<string, Date>();
  private deezCooldown = new Date(0);
  private dabCooldown = new Date(0);
  private meowChance = LukeController.INIT_MEOW_CHANCE;

  constructor() {
    if (LUKE_UID === undefined) {
      log.warn("luke UID not found.");
    }
    if (KLEE_UID === undefined) {
      log.warn("klee UID not found.");
    }
  }

  public async processMessage(message: Message) {
    // Ignore all bot messages (including self).
    if (message.author.bot)
      return;

    // Ignore messages in "immune" channels to avoid pollution.
    if (this.inImmuneChannel(message)) {
      // Klee can bypass channel filter.
      if (message.author.id !== KLEE_UID)
        return;
    }

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

  private inImmuneChannel(message: Message): boolean {
    const channel = message.channel as GuildTextBasedChannel;
    const channelName = channel.name.toLowerCase();

    // Might be best to not annoy the kiddos too much.
    if (channelName.indexOf("general") !== -1)
      return true;

    // Don't pollute important channels.
    const importantSubstrings = ["introductions", "announcements", "welcome"];
    if (importantSubstrings.some(s => channelName.indexOf(s) !== -1))
      return true;

    // TODO: Maybe also somehow ignore "serious" channels (such as forum posts
    // tagged with Mental Health).

    return false;
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

    const context = formatContext(message);

    // Klee can bypass cooldown.
    if (message.author.id === KLEE_UID) {
      await replySilently(message, "dab");
      log.debug(`${context}: replied with dab (bypassed cooldown).`);
      return; // Independent from ongoing cooldown.
    }

    const now = new Date();
    if (this.dabCooldown >= now)
      return;

    await replySilently(message, "dab");
    this.dabCooldown = addDateSeconds(now, LukeController.DAB_COOLDOWN_SEC);
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
