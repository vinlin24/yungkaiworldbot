jest.mock("../../../src/services/timeout.service");

import {
  Collection,
  EmbedBuilder,
  TimestampStyles,
  time,
  userMention,
} from "discord.js";

import { Matcher } from "jest-mock-extended";
import timeoutImmunitiesSpec from "../../../src/controllers/moderation/timeout-immunities.command";
import timeoutService from "../../../src/services/timeout.service";
import { MockInteraction } from "../../test-utils";

const mockedTimeoutService = jest.mocked(timeoutService);

const dummyNow = new Date(100);

let mock: MockInteraction;

beforeEach(() => {
  mock = new MockInteraction(timeoutImmunitiesSpec);
  jest.useFakeTimers();
  jest.setSystemTime(dummyNow);
});

afterEach(() => {
  jest.useRealTimers();
});

const dummyImmunities = [
  ["1234567890", new Date(100 + 60 * 1000)],
  ["9876543210", new Date(100 + 120 * 1000)],
  ["4242424242", new Date(100 + 100 * 1000)],
] as const;

it("should list immunities", async () => {
  mockedTimeoutService.listImmunities.mockReturnValueOnce(
    new Collection(dummyImmunities),
  );

  const embedMatcher = new Matcher<EmbedBuilder>(embed => {
    for (const [uid, expiration] of dummyImmunities) {
      const timestamp = time(expiration);
      const relative = time(expiration, TimestampStyles.RelativeTime);
      const entry =
        `${userMention(uid)} is immune until ${timestamp} (${relative}).`;
      if (!embed.data.description?.includes(entry)) return false;
    }
    return true;
  }, "embed matcher");

  await mock.simulateCommand();
  expect(mockedTimeoutService.listImmunities).toHaveBeenCalled();
  mock.expectRepliedWith({
    // @ts-expect-error Claims it wants APIEmbed but actually uses EmbedBuilder.
    embeds: [embedMatcher],
  });
});
