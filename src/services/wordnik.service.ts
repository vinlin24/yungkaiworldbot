import axios, { AxiosError } from "axios";
import { Collection } from "discord.js";

import env from "../config";
import getLogger from "../logger";
import { RequireKeys, ResultPair } from "../types/generic.types";

const log = getLogger(__filename);

/**
 * See the dropdown menu for `partOfSpeech` at:
 * https://developer.wordnik.com/docs#!/word/getDefinitions.
 */
export type PartOfSpeech =
  | "noun"
  | "adjective"
  | "verb"
  | "adverb"
  | "interjection"
  | "pronoun"
  | "preposition"
  | "abbreviation"
  | "affix"
  | "article"
  | "auxiliary-verb"
  | "conjunction"
  | "definite-article"
  | "family-name"
  | "given-name"
  | "idiom"
  | "imperative"
  | "noun-plural"
  | "noun-posessive" // API has misspelling.
  | "past-participle"
  | "phrasal-prefix"
  | "proper-noun"
  | "proper-noun-plural"
  | "proper-noun-posessive" // API has misspelling.
  | "suffix"
  | "verb-intransitive"
  | "verb-transitive"
  ;

/**
 * See the dropdown menu for `sourceDictionaries` at:
 * https://developer.wordnik.com/docs#!/word/getDefinitions.
 */
type SourceDictionary =
  | "ahd-5"
  | "century"
  | "wiktionary"
  | "webster"
  | "wordnet"
  ;

/**
 * Schema for ONE definition object in the array of objects returned by the
 * Wordnik's word definitions endpoint. That is, the type for the response JSON
 * should be `WordnikDefinitionPayload[]`.
 *
 * See `Inline Model 1` at:
 * https://developer.wordnik.com/docs#!/word/getDefinitions.
 *
 * Some type narrowing was inferred from playing around with the API using the
 * codebase's Wordnik script.
 */
type WordnikDefinitionPayload<Word extends string = string> = {
  attributionText?: string;
  attributionUrl?: string;
  citations: unknown[];
  exampleUses: object[];
  extendedText?: string;
  labels: unknown[];
  notes: unknown[];
  partOfSpeech?: PartOfSpeech;
  relatedWords: unknown[];
  score?: number;
  seqString?: string;
  sequence?: `${number}`;
  sourceDictionary?: SourceDictionary;
  text?: string;
  textProns: unknown[];
  word: Word;
};

type SimplifiedDefinitionPayload = {
  partOfSpeech: PartOfSpeech;
  definition: string;
};

/**
 * Wrapper of Axios methods for interacting with REST APIs.
 *
 * TODO: Move this to a shared helper module when a new service can use this
 * too.
 */
class RESTService<B extends string> {
  private instance = axios.create({ baseURL: this.baseUrl });

  constructor(
    /** Base URL of REST API to consume. */
    public readonly baseUrl: B,
  ) { }

  public async get<R = unknown>(
    endpoint: string,
    params?: Record<string, any>,
  ): ResultPair<R, AxiosError> {
    try {
      const response = await this.instance.get<R>(endpoint, { params });
      return [response.data, null];
    }
    catch (error) {
      return [null, error as AxiosError];
    }
  }

  // ... other methods in the future ...
}

export class WordnikService {
  private readonly apiConfig = {
    definitions: <Word extends string>(wordToSearch: Word) =>
      `/word.json/${wordToSearch}/definitions` as const,
  };
  private readonly rest = new RESTService("https://api.wordnik.com/v4");

  /**
   * Return a mapping from part of speech to definitions of that part of speech.
   */
  public async getDefinitions<Word extends string>(word: Word): Promise<
    | Collection<PartOfSpeech, string[]>
    | "Not Found"
    | "Unknown Error"
  > {
    const [defs, error] = await this.rest.get<WordnikDefinitionPayload[]>(
      this.apiConfig.definitions(word),
      { api_key: env.WORDNIK_API_KEY },
    );

    if (error) {
      // Wordnik returns 404 if the word doesn't exist.
      if (error.response?.status === 404) {
        return "Not Found";
      }
      log.error("unknown error in calling Wordnik API.");
      console.error(error);
      return "Unknown Error";
    }

    const simplifiedDefinitions = this.simplifyDefinitionObjects(defs);
    const result = new Collection<PartOfSpeech, string[]>();
    for (const { partOfSpeech, definition } of simplifiedDefinitions) {
      let definitionTexts = result.get(partOfSpeech);
      if (!definitionTexts) {
        definitionTexts = [];
        result.set(partOfSpeech, definitionTexts);
      }
      definitionTexts.push(definition);
    }
    return result;
  }

  private simplifyDefinitionObjects(
    definitions: WordnikDefinitionPayload[],
  ): SimplifiedDefinitionPayload[] {
    // Not all entries have the partOfSpeech and text for some reason.
    const filtered = definitions.filter(def => def.partOfSpeech && def.text) as
      RequireKeys<WordnikDefinitionPayload, "partOfSpeech" | "text">[];

    return filtered.map(def => ({
      partOfSpeech: def.partOfSpeech,
      // Also remove the weird XML (?) tags.
      definition: def.text.replace(/<\/?.+?>/g, ""),
    }));
  }
}

export default new WordnikService();
