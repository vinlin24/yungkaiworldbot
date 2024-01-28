import fs from "node:fs";
import path from "node:path";

import { Collection, GuildTextBasedChannel } from "discord.js";
import _ from "lodash";

import { ASSETS_PATH } from "../config";
import getLogger from "../logger";

const log = getLogger(__filename);

const ANSWERS_FILE_PATH = path.join(ASSETS_PATH, "wordle_answer_words.txt");
const WORDS_FILE_PATH = path.join(ASSETS_PATH, "wordle_possible_words.txt");

/** Holds words that can possibly be an answer. */
export const WORDLE_ANSWER_WORDS = fs
  .readFileSync(ANSWERS_FILE_PATH)
  .toString()
  .split("\n");

/** Used to validate guess words. A superset of possible answer words. */
export const WORDLE_POSSIBLE_WORDS = new Set(
  fs.readFileSync(WORDS_FILE_PATH)
    .toString()
    .split("\n"),
);

/**
 * Represents the correctness of a letter in a certain position. Analogous to
 * the "color" of the tile that shows up in the real Wordle game.
 */
export const enum WordleCharState {
  /**
   * The letter is in the word and in the correct position. A "green" tile in
   * the real Wordle game.
   */
  CORRECT,
  /**
   * The letter is in the word but in an incorrect position. A "yellow" tile in
   * the real Wordle game.
   */
  VALID,
  /**
   * The letter is not in the word. A "gray" tile in the real Wordle game.
   */
  ABSENT,
}

/**
 * Status of the game following a guessed word.
 */
export const enum WordleSessionStatus {
  /** The word has not been guessed yet. */
  IN_PROGRESS,
  /** The word has been guessed, and the winner can be declared. */
  WINNER,
  /** The word is not recognized as one of the possible guess words. */
  INVALID_GUESS,
  /** The guess word has too many characters. */
  GUESS_TOO_LONG,
  /** The guess word has too few characters. */
  GUESS_TOO_SHORT,
  /** The guess word has already been guessed in the same session. */
  ALREADY_GUESSED,
}

export type WordleGuessState = [
  WordleCharState,
  WordleCharState,
  WordleCharState,
  WordleCharState,
  WordleCharState,
];

export type WordleGuess = {
  word: string;
  state: WordleGuessState;
};

export class WordleInitializationError extends Error { }

export class WordleSession {
  private static readonly START_STATE = [
    WordleCharState.ABSENT,
    WordleCharState.ABSENT,
    WordleCharState.ABSENT,
    WordleCharState.ABSENT,
    WordleCharState.ABSENT,
  ] as const;

  private word = this.chooseRandomWord();
  private guesses = new Set<string>();
  private history: WordleGuess[] = [];
  private state: WordleGuessState = [...WordleSession.START_STATE];

  public get answerWord(): string {
    return this.word;
  }
  public get numGuesses(): number {
    return this.guesses.size;
  }
  public get currentState(): Readonly<WordleGuessState> {
    return this.state;
  }
  public get guessHistory(): Readonly<WordleGuess[]> {
    return this.history;
  }

  constructor() {
    if (WORDLE_ANSWER_WORDS.length === 0) {
      throw new WordleInitializationError(
        "Wordle answer words didn't initialize properly",
      );
    }
    if (WORDS_FILE_PATH.length === 0) {
      throw new WordleInitializationError(
        "Wordle possible words didn't initialize properly",
      );
    }
  }

  /**
   * Guess a word to advance the game state.
   */
  public guess(guessWord: string): WordleSessionStatus {
    const { length } = guessWord;
    if (length > 5) return WordleSessionStatus.GUESS_TOO_LONG;
    if (length < 5) return WordleSessionStatus.GUESS_TOO_SHORT;

    guessWord = guessWord.toLowerCase();
    if (!WORDLE_POSSIBLE_WORDS.has(guessWord)) {
      return WordleSessionStatus.INVALID_GUESS;
    }
    if (this.guesses.has(guessWord)) {
      return WordleSessionStatus.ALREADY_GUESSED;
    }
    this.guesses.add(guessWord);

    this.updateState(guessWord);

    const guessRecord: WordleGuess = {
      word: guessWord,
      state: _.clone(this.state),
    };
    this.history.push(guessRecord);

    if (this.state.every(state => state === WordleCharState.CORRECT)) {
      return WordleSessionStatus.WINNER;
    }
    return WordleSessionStatus.IN_PROGRESS;
  }

  /**
   * Return a random word from the global array of possible Wordle answers.
   */
  private chooseRandomWord(): string {
    // Bang b/c sample() returns undefined iff collection is empty.
    const word = _.sample(WORDLE_ANSWER_WORDS)!;
    return word;
  }

  /**
   * Update `this.state` to reflect the state of the Wordle tiles after guessing
   * with `guessWord`.
   */
  private updateState(guessWord: string): void {
    // Reset the state and then mutate it in-place.
    this.state = [...WordleSession.START_STATE];

    // NOTE: _.countBy is analogous to Python's collections.Counter.
    const countsLeft = _.countBy(this.word);

    // First pass: assign exactly correct tiles.
    for (let i = 0; i < guessWord.length; i++) {
      const char = guessWord[i];
      if (char === this.word[i]) {
        this.state[i] = WordleCharState.CORRECT;
        countsLeft[char]--;
      }
    }

    // Second pass: assign valid tiles (do NOT overwrite already correct tiles).
    for (let i = 0; i < guessWord.length; i++) {
      const char = guessWord[i];
      if (countsLeft[char] > 0 && this.state[i] !== WordleCharState.CORRECT) {
        this.state[i] = WordleCharState.VALID;
        countsLeft[char]--;
      }
    }
  }
}

export class WordleService {
  /** CID-to-session mapping of per-channel Wordle game sessions. */
  private sessions = new Collection<string, WordleSession>();

  public createSession(
    channel: GuildTextBasedChannel,
  ): WordleSession | "already exists" {
    const { id: cid } = channel;
    const existingSession = this.sessions.get(cid);
    if (existingSession) return "already exists";

    const newSession = new WordleSession();
    this.sessions.set(cid, newSession);
    log.info(`created new Wordle session for #${channel.name}.`);
    log.debug(`Wordle answer for #${channel.name}: ${newSession.answerWord}.`);
    return newSession;
  }

  public getSession(channel: GuildTextBasedChannel): WordleSession | null {
    return this.sessions.get(channel.id) ?? null;
  }

  public removeSession(channel: GuildTextBasedChannel): void {
    const { id: cid } = channel;
    if (this.sessions.has(cid)) {
      this.sessions.delete(cid);
      log.info(`deleted Wordle session for #${channel.name}.`);
    }
  }
}

export default new WordleService();
