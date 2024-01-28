import {
  ColorResolvable,
  EmbedBuilder,
  GuildTextBasedChannel,
  Message,
  UserMention,
  bold,
  inlineCode,
  userMention,
} from "discord.js";
import _ from "lodash";

import { BOT_SPAM_CID } from "../../config";
import getLogger from "../../logger";
import { inChannel } from "../../middleware/filters.middleware";
import wordleService, {
  WordleCharState,
  WordleGuessState,
  WordleSessionStatus,
} from "../../services/wordle.service";
import { MessageListenerBuilder } from "../../types/listener.types";
import { replySilently } from "../../utils/interaction.utils";
import { formatContext } from "../../utils/logging.utils";

const log = getLogger(__filename);

const wordle = new MessageListenerBuilder().setId("wordle");

wordle.filter(inChannel(BOT_SPAM_CID));
wordle.execute(async message => {
  const { channel } = message;
  // TODO: Can this type guard checking be automated so we don't have to keep
  // using assertions/possibly accrue technical debt from assuming text-based
  // channels all the time?
  if (!channel.isTextBased() || channel.isDMBased()) return false;
  const processor = new WordleCommandProcessor(channel, message);
  const success = await processor.process();
  return success;
});

class WordleCommandProcessor {
  private context = formatContext(this.message);

  constructor(
    private channel: GuildTextBasedChannel,
    private message: Message,
  ) { }

  private get mention(): UserMention {
    return userMention(this.message.author.id);
  }

  public async process(): Promise<boolean> {
    const { content: command } = this.message;
    const tokens = command.toLowerCase().split(/\s+/);

    if (_.isEqual(tokens, ["new", "wordle"])) {
      log.debug(`${this.context}: new-wordle text command.`);
      return await this.newWordle();
    }
    if (tokens.length === 2 && tokens[0] === "guess") {
      log.debug(`${this.context}: guess-word text command ('${tokens[1]}').`);
      return await this.guessWord(tokens[1]);
    }
    if (_.isEqual(tokens, ["quit", "wordle"])) {
      log.debug(`${this.context}: quit-wordle text command.`);
      return await this.quitWordle();
    }
    if (_.isEqual(tokens, ["see", "history"])) {
      log.debug(`${this.context}: see-history text command.`);
      return await this.seeHistory();
    }
    return false;
  }

  private async newWordle(): Promise<boolean> {
    const session = wordleService.createSession(this.channel);

    if (session === "already exists") {
      log.debug(
        `${this.context}: tried to create a Wordle session ` +
        "but one is already in progress in this channel.",
      );
      const embed = this.formatEmbed("error", {
        description:
          `${this.mention}, a Wordle game is already in progress! ` +
          `You can use ${inlineCode("quit wordle")} to give up on the ` +
          "current game and reveal the answer.",
      });
      await this.replyWithEmbed(embed);
      return false;
    }

    const embed = this.formatEmbed("positive", {
      description: `${this.mention} has started a new Wordle session!`,
    });
    await this.replyWithEmbed(embed);
    return true;
  }

  private async guessWord(word: string): Promise<boolean> {
    const session = wordleService.getSession(this.channel);
    if (!session) {
      await this.warnNoSession();
      return false;
    }

    const status = session.guess(word);

    const guessTitle = `${this.message.member!.displayName}'s Guess`;
    const formattedGuess = this.formatGuess(word, session.currentState);

    // To be appended to for completing an error message in event of an error.
    let errorMessage = `${this.mention}, ${bold(word)}`;

    let embedType: Parameters<typeof this.formatEmbed>[0];
    const embedOptions: Parameters<typeof this.formatEmbed>[1] = {
      description: formattedGuess,
      title: guessTitle,
    };

    switch (status) {
      case WordleSessionStatus.WINNER:
        wordleService.removeSession(this.channel);
        embedType = "positive";
        embedOptions.title = `${guessTitle} - WINNER!`;
        embedOptions.footer = `Guessed with ${session.numGuesses} guess(es).`;
        break;
      case WordleSessionStatus.IN_PROGRESS:
        embedType = "positive";
        break;
      case WordleSessionStatus.INVALID_GUESS:
        embedType = "error";
        errorMessage += " is not a valid word!";
        break;
      case WordleSessionStatus.ALREADY_GUESSED:
        embedType = "error";
        errorMessage += " was already guessed!";
        break;
      case WordleSessionStatus.GUESS_TOO_LONG:
        embedType = "error";
        errorMessage += " is too long!";
        break;
      case WordleSessionStatus.GUESS_TOO_SHORT:
        embedType = "error";
        errorMessage += " is too short!";
    }

    if (embedType === "error") {
      embedOptions.description = errorMessage;
    }

    const embed = this.formatEmbed(embedType, embedOptions);
    await this.replyWithEmbed(embed);
    return true;
  }

  private async quitWordle(): Promise<boolean> {
    const session = wordleService.getSession(this.channel);
    if (!session) {
      await this.warnNoSession();
      return false;
    }

    wordleService.removeSession(this.channel);

    const { answerWord, numGuesses } = session;
    const embed = this.formatEmbed("neutral", {
      description: `${this.mention} has quit the current Wordle game.`,
      footer: `The answer was "${answerWord}". ${numGuesses} guess(es) used.`,
    });
    await this.replyWithEmbed(embed);
    return true;
  }

  private async seeHistory(): Promise<boolean> {
    const session = wordleService.getSession(this.channel);
    if (!session) {
      await this.warnNoSession();
      return false;
    }

    const { guessHistory, numGuesses } = session;

    let description = guessHistory
      .map(entry => this.formatGuess(entry.word, entry.state))
      .join("\n\n");
    if (!description) {
      description =
        `None so far! Make a guess with ${inlineCode("guess <word>")}.`;
    }

    const embed = this.formatEmbed("neutral", {
      description,
      title: "Guesses So Far",
      footer: `${numGuesses} guesses so far.`,
    });
    await this.replyWithEmbed(embed);
    return true;
  }

  private async warnNoSession(): Promise<void> {
    const description =
      `${this.mention}, there's currently no Wordle session in progress! ` +
      `Use the ${inlineCode("new wordle")} command to start a new one.`;
    const embed = this.formatEmbed("error", { description });
    await this.replyWithEmbed(embed);
  }

  private formatEmbed(
    type: "positive" | "neutral" | "error",
    options: {
      description: string,
      title?: string,
      footer?: string,
    },
  ): EmbedBuilder {
    let color: ColorResolvable;
    switch (type) {
      case "positive":
        color = "Green";
        break;
      case "neutral":
        color = "Yellow";
        break;
      case "error":
        color = "Red";
        break;
    }

    const embed = new EmbedBuilder()
      .setTitle(options.title ?? null)
      .setDescription(options.description)
      .setFooter(options.footer ? { text: options.footer } : null)
      .setColor(color);

    return embed;
  }

  private async replyWithEmbed(embed: EmbedBuilder): Promise<void> {
    await replySilently(this.message, { embeds: [embed] });
  }

  private formatGuess(
    guessWord: string,
    charStates: Readonly<WordleGuessState>,
  ): string {
    const guessWordChars = Array.from(guessWord.toLowerCase());
    let result = guessWordChars
      .map(char => `:regional_indicator_${char}:`)
      .join(" ");

    const STATE_TO_EMOJI = {
      [WordleCharState.CORRECT]: ":green_square:",
      [WordleCharState.VALID]: ":yellow_square:",
      [WordleCharState.ABSENT]: ":white_large_square:",
    } as const;

    result += "\n";
    result += charStates.map(state => STATE_TO_EMOJI[state]).join(" ");
    return result;
  }
}

const wordleSpec = wordle.toSpec();
export default wordleSpec;
