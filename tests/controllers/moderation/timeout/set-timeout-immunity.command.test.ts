jest.mock("../../../../src/services/timeout.service");
jest.mock("../../../../src/utils/dates.utils", () => {
  return {
    ...jest.requireActual("../../../../src/utils/dates.utils"),
    durationToSeconds: jest.fn(),
  };
});

import { GuildMember, TimestampStyles, time, userMention } from "discord.js";
import { Matcher } from "jest-mock-extended";

import { cloneDeep } from "lodash";
import config from "../../../../src/config";
import timeoutImmunitySpec from "../../../../src/controllers/moderation/timeout/set-timeout-immunity.command";
import timeoutService from "../../../../src/services/timeout.service";
import { durationToSeconds } from "../../../../src/utils/dates.utils";
import { MockInteraction } from "../../../test-utils";

const mockedTimeoutService = jest.mocked(timeoutService);
const mockedDurationToSeconds = jest.mocked(durationToSeconds);

let mock: MockInteraction;

beforeEach(() => mock = new MockInteraction(timeoutImmunitySpec));

const mockMember = {
  id: "123456789",
  timeout: jest.fn(),
} as unknown as GuildMember;

function expectServiceNotCalled(): void {
  expect(mockedTimeoutService.grantImmunity).not.toHaveBeenCalled();
  expect(mockedTimeoutService.isImmune).not.toHaveBeenCalled();
  expect(mockedTimeoutService.revokeImmunity).not.toHaveBeenCalled();
}

it("should require privilege level >= ALPHA_MOD", async () => {
  mock
    .mockCaller({ roleIds: [config.BABY_MOD_RID] })
    .mockOption("Boolean", "immune", true)
    .mockOption<GuildMember>("Member", "user", mockMember);

  await mock.simulateCommand();

  mock.expectRepliedWith({
    content: expect.stringContaining("ALPHA_MOD"), // Some mention of it.
    ephemeral: true,
  });
  expectServiceNotCalled();
});

describe("granting immunity", () => {
  const dummyDate = new Date(42);
  const dummyExpiration = new Date(42 + 600 * 1000);

  const responseMatcher = new Matcher<string>(value => {
    const requirements = [
      userMention(mockMember.id),
      time(dummyExpiration),
      time(dummyExpiration, TimestampStyles.RelativeTime),
    ] as const;
    return requirements.every(s => value.includes(s));
  }, "content matcher");

  it("should grant immunity", async () => {
    mock
      .mockCaller({ roleIds: [config.ALPHA_MOD_RID] })
      .mockOption("Boolean", "immune", true)
      .mockOption<GuildMember>("Member", "user", mockMember)
      .mockOption("String", "duration", "DUMMY-DURATION");

    const dateSpy = jest.spyOn(global, "Date");
    // NOTE: NEED to clone dummyDate addDateSeconds mutates the Date in-place
    // somehow when Date is mocked. SPENT TOO LONG DEBUGGING THIS!!
    dateSpy.mockImplementation(() => cloneDeep(dummyDate));
    mockedDurationToSeconds.mockReturnValueOnce(600);

    await mock.simulateCommand();

    mock.expectRepliedWith({
      content: responseMatcher as any,
      allowedMentions: expect.objectContaining({ parse: [] }),
    });
    expect(mockedTimeoutService.grantImmunity).toHaveBeenCalledWith(
      mockMember.id,
      dummyExpiration,
    );
  });

  it("should untime timed out users when granting immunity", async () => {
    mock
      .mockCaller({ roleIds: [config.ALPHA_MOD_RID] })
      .mockOption("Boolean", "immune", true)
      .mockOption("String", "duration", "DUMMY-DURATION")
      .mockOption<GuildMember>("Member", "user", {
        ...mockMember,
        // communicationDisabledUntil: new Date(42 + 60 * 1000),
      } as GuildMember);

    const dateSpy = jest.spyOn(global, "Date");
    // NOTE: NEED to clone dummyDate addDateSeconds mutates the Date in-place
    // somehow when Date is mocked. SPENT TOO LONG DEBUGGING THIS!!
    dateSpy.mockImplementation(() => cloneDeep(dummyDate));
    mockedDurationToSeconds.mockReturnValueOnce(600);

    await mock.simulateCommand();

    mock.expectRepliedWith({
      content: responseMatcher as any,
      allowedMentions: expect.objectContaining({ parse: [] }),
    });
    expect(mockedTimeoutService.grantImmunity).toHaveBeenCalledWith(
      mockMember.id,
      dummyExpiration,
    );
    expect(mockMember.timeout).toHaveBeenCalledWith(null);
  });
});

it("should revoke immunity", async () => {
  mock
    .mockCaller({ roleIds: [config.ALPHA_MOD_RID] })
    .mockOption("Boolean", "immune", false)
    .mockOption<GuildMember>("Member", "user", mockMember);

  await mock.simulateCommand();

  mock.expectRepliedWith({
    content: expect.stringContaining(userMention(mockMember.id)),
    allowedMentions: expect.objectContaining({ parse: [] }),
  });
  expect(mockedTimeoutService.revokeImmunity)
    .toHaveBeenCalledWith(mockMember.id);
});
