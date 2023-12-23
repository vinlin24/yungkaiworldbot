import { GuildTextBasedChannel, Message } from "discord.js";
import getLogger from "../logger";
import { addDateSeconds } from "../utils/dates.utils";
import { replySilently } from "../utils/interaction.utils";
import { formatContext } from "../utils/logging.utils";
import uids from "../utils/uids.utils";

const log = getLogger(__filename);

export class CoffeeService {
  public static UWU_COOLDOWN_SEC = 600;
  public static UFF_COOLDOWN_SEC = 600;

  private uwuCooldown = new Date(0);
  private uffCooldown = new Date(0);

  constructor() {
    // TODO: This seems to be a common pattern (defining a service for
    // user-specific features). There's probably a better way to
    // organize/automate the checking/handling of UIDs.
    if (uids.COFFEE === undefined) {
      log.warn("coffee UID not found.");
    }
  }

  public async processMessage(message: Message) {
    await this.processPhrases(message);
    await this.processCrazy(message);
    await this.processLukeReplies(message);
  }

  private async processPhrases(message: Message) {
    if (message.author.id !== uids.COFFEE)
      return;

    const context = formatContext(message);
    const now = new Date();

    const chars = message.content.toLowerCase();
    // TODO: Is there a better way to abstract this pattern of cooldown checking
    // and updating? Or make it declarative somehow?
    if (chars === "uff" && this.uffCooldown < now) {
      await replySilently(message, "woof");
      this.uffCooldown = addDateSeconds(now, CoffeeService.UFF_COOLDOWN_SEC);
      log.info(`${context}: replied to uff.`);

    } else if (chars === "uwu" && this.uwuCooldown < now) {
      await message.react("🤢");
      await message.react("🤮");
      this.uwuCooldown = addDateSeconds(now, CoffeeService.UWU_COOLDOWN_SEC);
      log.info(`${context}: reacted to uwu.`);
    }
  }

  private async processCrazy(message: Message) {
    const channelName = (message.channel as GuildTextBasedChannel).name;
    if (channelName.toLowerCase().includes("general"))
      return;

    const chars = message.content.toLowerCase();
    const withoutEndPunct = chars.replace(/[.!?~-]$/, "");

    let response: string;
    if (chars.endsWith("crazy?"))
      response = "I was crazy once.";
    else if (/.*crazy[.!~-]*$/i.exec(message.content))
      response = "Crazy?";
    else if (withoutEndPunct === "i was crazy once")
      response = "They locked me in a room";
    else if (withoutEndPunct === "they locked me in a room")
      response = "A rubber room";
    else if (withoutEndPunct === "a rubber room")
      response = "A rubber room with rats";
    else if (withoutEndPunct === "a rubber room with rats")
      response = "And rats make me crazy"
    else
      return

    await replySilently(message, response);
  }

  private async processLukeReplies(message: Message) {
    if (!message.reference)
      return;

    const referenceId = message.reference.messageId!;
    const referencedMessage = await message.channel.messages.fetch(referenceId);

    const authorId = message.author.id;
    const repliedId = referencedMessage.author.id;
    if (
      (authorId === uids.COFFEE && repliedId === uids.LUKE) ||
      (authorId === uids.LUKE && repliedId === uids.COFFEE)
    ) {
      await message.react("🇱");
      await message.react("🇴");
      await message.react("🇫");
      await message.react("🇮");
      const context = formatContext(message);
      log.info(`${context}: reacted with LOFI.`);
    }
  }
}

export default new CoffeeService();
