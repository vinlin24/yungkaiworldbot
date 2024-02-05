jest.mock("../../../src/services/wordnik.service");

import {
  APIEmbed,
  Collection,
  EmbedBuilder,
  inlineCode,
  roleMention,
} from "discord.js";
import { Matcher } from "jest-mock-extended";
import _ from "lodash";

import { BOT_DEV_RID } from "../../../src/config";
import dictionarySpec from "../../../src/controllers/convenience/dictionary.command";
import wordnikService, {
  PartOfSpeech,
} from "../../../src/services/wordnik.service";
import { MockInteraction } from "../../test-utils";

let mock: MockInteraction;
beforeEach(() => { mock = new MockInteraction(dictionarySpec); });

it("should look up the definition of a word", async () => {
  mock.mockOption("String", "word", "board");
  const dummyDefinitions = new Collection<PartOfSpeech, string[]>([
    ["noun", ["noun definition 1", "noun definition 2"]],
    ["verb", ["verb definition 1", "verb definition 2"]],
    ["adjective", ["adjective definition 1", "adjective definition 2"]],
  ]);
  jest.mocked(wordnikService.getDefinitions)
    .mockResolvedValueOnce(dummyDefinitions);

  await mock.simulateCommand();

  const embedMatcher = new Matcher<EmbedBuilder>(embed => {
    const correctTitle = embed.data.title === "board";
    const correctFieldTitles = _.isEqual(
      embed.data.fields?.map(field => field.name),
      ["noun", "verb", "adjective"],
    );
    return correctTitle && correctFieldTitles;
  }, "embed matcher");
  mock.expectRepliedWith({
    embeds: [embedMatcher as unknown as APIEmbed],
  });
});

describe("error handling", () => {
  it("should gracefully handle unknown words", async () => {
    const dummyWord = "fdahskulghalkgha";
    mock.mockOption("String", "word", dummyWord);
    jest.mocked(wordnikService.getDefinitions)
      .mockResolvedValueOnce("Not Found");

    await mock.simulateCommand();

    mock.expectRepliedWith({
      content: `I don't think ${inlineCode(dummyWord)} is a valid word!`,
      ephemeral: true,
    });
  });

  it("should gracefully handle unknown service errors", async () => {
    mock.mockOption("String", "word", "board");
    jest.mocked(wordnikService.getDefinitions)
      .mockResolvedValueOnce("Unknown Error");

    await mock.simulateCommand();

    mock.expectRepliedWith({
      content:
        "Oops! My dictionary service is experiencing unexpected difficulties " +
        `right now. Try again later or let a ${roleMention(BOT_DEV_RID)} know!`,
      ephemeral: true,
    });
  });
});
