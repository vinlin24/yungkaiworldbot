jest.mock("../../../../src/services/timeout.service");

import {
  Collection,
  EmbedBuilder,
  GuildMember,
  time,
  userMention,
} from "discord.js";

import { Matcher } from "jest-mock-extended";
import listTimeoutsSpec from "../../../../src/controllers/moderation/timeout/list-timeouts.command";
import timeoutService from "../../../../src/services/timeout.service";
import { MockInteraction } from "../../../test-utils";

const mockedTimeoutService = jest.mocked(timeoutService);

const dummyNow = new Date(100);

const mockTimedOut1 = {
  id: "123456789",
  communicationDisabledUntil: new Date(100 + 4242 * 1000),
} as GuildMember;

const mockTimedOut2 = {
  id: "987654321",
  communicationDisabledUntil: new Date(100 + 6000 * 1000),
} as GuildMember;

const mockNotTimedOut = {
  id: "4242424242",
} as GuildMember;

const mockTimeoutExpired = {
  id: "4455667788",
  communicationDisabledUntil: new Date(0),
} as GuildMember;

const dummyImmunities = [
  ["1234567890", new Date(100 + 60 * 1000)],
  ["9876543210", new Date(100 + 120 * 1000)],
  ["4242424242", new Date(100 + 100 * 1000)],
] as const;

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(dummyNow);
});

afterEach(() => {
  jest.useRealTimers();
});

it("should list all timeouts and immunities", async () => {
  const mock = new MockInteraction(listTimeoutsSpec);
  mock.interaction.guild!.members.fetch.mockResolvedValueOnce(
    new Collection([
      [mockTimedOut1.id, mockTimedOut1],
      [mockTimedOut2.id, mockTimedOut2],
      [mockNotTimedOut.id, mockNotTimedOut],
      [mockTimeoutExpired.id, mockTimeoutExpired],
    ]),
  );
  mockedTimeoutService.listImmunities.mockReturnValueOnce(
    new Collection(dummyImmunities),
  );

  await mock.simulateCommand();

  const embedMatcher = new Matcher<EmbedBuilder>(embed => {
    const timedOutRequirements = [
      userMention(mockTimedOut1.id),
      userMention(mockTimedOut2.id),
      time(mockTimedOut1.communicationDisabledUntil!),
      time(mockTimedOut2.communicationDisabledUntil!),
    ] as const;

    const timedOutGood = timedOutRequirements.every(mention => {
      return embed.data.fields?.[0].value.includes(mention);
    });

    const immunityRequirements = [
      userMention(dummyImmunities[0][0]),
      userMention(dummyImmunities[1][0]),
      userMention(dummyImmunities[2][0]),
      time(dummyImmunities[0][1]),
      time(dummyImmunities[1][1]),
      time(dummyImmunities[2][1]),
    ] as const;
    const immunityGood = immunityRequirements.every(mention => {
      return embed.data.fields?.[1].value.includes(mention);
    });

    return timedOutGood && immunityGood;
  }, "embed matcher");

  mock.expectRepliedWith({
    // @ts-expect-error Expects APIEmbed but is actually EmbedBuilder.
    embeds: [embedMatcher],
    allowedMentions: { repliedUser: false, parse: [] },
  });
});

it("should still have field values when no users are timed out", async () => {
  const mock = new MockInteraction(listTimeoutsSpec);
  mock.interaction.guild!.members.fetch.mockResolvedValueOnce(
    new Collection([
      [mockNotTimedOut.id, mockNotTimedOut],
    ]),
  );
  mockedTimeoutService.listImmunities.mockReturnValueOnce(new Collection());

  await mock.simulateCommand();

  const embedMatcher = new Matcher<EmbedBuilder>(embed => {
    const timedOutGood = !!embed.data.fields?.[0].value;
    const immunityGood = !!embed.data.fields?.[1].value;
    return timedOutGood && immunityGood;
  }, "embed matcher");

  mock.expectRepliedWith({
    // @ts-expect-error Expects APIEmbed but is actually EmbedBuilder.
    embeds: [embedMatcher],
    allowedMentions: { repliedUser: false, parse: [] },
  });
});
