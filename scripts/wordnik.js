#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

const { ArgumentParser } = require("argparse");
const axios = require("axios").default;
const dotenv = require("dotenv");

dotenv.config();

const WORDNIK_API_KEY = process.env.WORDNIK_API_KEY;

const BASE_URL = "https://api.wordnik.com/v4";

const apiConfig = {
  definitions: (wordToSearch) =>
    `${BASE_URL}/word.json/${wordToSearch}/definitions`,
};

const parser = new ArgumentParser({
  description:
    "Simple script for retrieving definitions for a word via the Wordnik API",
});

parser.add_argument("word", {
  metavar: "WORD",
  help: "word to search for",
});
parser.add_argument("-n", "--limit", {
  type: "int",
  help: "max number of definitions to return",
});
parser.add_argument("-f", "--full", {
  action: "store_true",
  help: "show full JSON for each word instead of simple version",
});
parser.add_argument("-p", "--part-of-speech", {
  dest: "partOfSpeech",
  choices: [
    "noun",
    "adjective",
    "verb",
    "adverb",
    "interjection",
    "pronoun",
    "preposition",
    "abbreviation",
    "article",
    "conjunction",
    // There are more: https://developer.wordnik.com/docs#!/word/getDefinitions.
  ],
  help: "show only definitions for this part of speech",
});
parser.add_argument("-j", "--json", {
  dest: "outputAsJSON",
  action: "store_true",
  help: "output in JSON-serialized format",
});

function printDefinitions(
  data,
  showFullDefinitions,
  thisPartOfSpeechOnly,
  outputAsJSON,
) {
  if (showFullDefinitions) {
    if (outputAsJSON) {
      console.log(JSON.stringify(data, null, 2));
    }
    else {
      console.log(data);
    }
    return;
  }

  let simplified = data.map(({ partOfSpeech, text }) => ({
    partOfSpeech,
    definition: text,
  }));
  if (thisPartOfSpeechOnly) {
    simplified = simplified.filter(({ partOfSpeech }) =>
      partOfSpeech === thisPartOfSpeechOnly,
    );
  }
  if (outputAsJSON) {
    console.log(JSON.stringify(simplified, null, 2));
  }
  else {
    console.log(simplified);
  }
}

async function main() {
  const args = parser.parse_args();
  const {
    word,
    limit = undefined,
    full = false,
    partOfSpeech = null,
    outputAsJSON = false,
  } = args;

  let response;
  try {
    response = await axios.get(apiConfig.definitions(word), {
      params: {
        api_key: WORDNIK_API_KEY,
        limit,
      },
    });
  }
  catch (error) {
    console.error(error);
    return 1;
  }

  printDefinitions(response.data, full, partOfSpeech, outputAsJSON);
  return 0;
}

main().then(process.exit);
