import {
  Collection,
  EmbedBuilder,
  GuildMember,
  time,
  userMention,
} from "discord.js";

import { Matcher } from "jest-mock-extended";
import listTimeoutsSpec from "../../../src/controllers/moderation/list-timeouts.command";
import { addDateSeconds } from "../../../src/utils/dates.utils";
import { MockInteraction } from "../../test-utils";

const now = new Date();

const mockTimedOut1 = {
  id: "123456789",
  communicationDisabledUntil: addDateSeconds(now, 4242),
} as GuildMember;

const mockTimedOut2 = {
  id: "987654321",
  communicationDisabledUntil: addDateSeconds(now, 6000),
} as GuildMember;

const mockNotTimedOut = {
  id: "4242424242",
} as GuildMember;

const mockTimeoutExpired = {
  id: "4455667788",
  communicationDisabledUntil: new Date(0),
} as GuildMember;

it("should list all timeouts", async () => {
  const mock = new MockInteraction(listTimeoutsSpec);
  mock.interaction.guild!.members.fetch.mockResolvedValueOnce(
    new Collection([
      [mockTimedOut1.id, mockTimedOut1],
      [mockTimedOut2.id, mockTimedOut2],
      [mockNotTimedOut.id, mockNotTimedOut],
      [mockTimeoutExpired.id, mockTimeoutExpired],
    ]),
  );

  await mock.simulateCommand();

  const embedMatcher = new Matcher<EmbedBuilder>(embed => {
    const mention1 = userMention(mockTimedOut1.id);
    const mention2 = userMention(mockTimedOut2.id);
    const timestamp1 = time(mockTimedOut1.communicationDisabledUntil!);
    const timestamp2 = time(mockTimedOut2.communicationDisabledUntil!);

    return [mention1, mention2, timestamp1, timestamp2].every(mention => {
      return embed.data.description?.includes(mention);
    });
  }, "embed matcher");
  mock.expectRepliedWith({
    // @ts-expect-error Expects APIEmbed but is actually EmbedBuilder.
    embeds: [embedMatcher],
    allowedMentions: { repliedUser: false, parse: [] },
  });
});

it("should still have a description when no users are timed out", async () => {
  const mock = new MockInteraction(listTimeoutsSpec);
  mock.interaction.guild!.members.fetch.mockResolvedValueOnce(
    new Collection([
      [mockNotTimedOut.id, mockNotTimedOut],
    ]),
  );

  await mock.simulateCommand();

  const embedMatcher = new Matcher<EmbedBuilder>(embed => {
    return !!embed.data?.description;
  }, "embed matcher");
  mock.expectRepliedWith({
    // @ts-expect-error Expects APIEmbed but is actually EmbedBuilder.
    embeds: [embedMatcher],
    allowedMentions: { repliedUser: false, parse: [] },
  });
});
