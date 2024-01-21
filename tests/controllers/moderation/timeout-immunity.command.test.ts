jest.mock("../../../src/services/timeout.service");
jest.mock("../../../src/utils/dates.utils", () => {
  return {
    ...jest.requireActual("../../../src/utils/dates.utils"),
    durationToSeconds: jest.fn(),
  };
});

import { TimestampStyles, User, time, userMention } from "discord.js";
import { Matcher } from "jest-mock-extended";

import config from "../../../src/config";
import timeoutImmunitySpec from "../../../src/controllers/moderation/timeout-immunity.command";
import timeoutService from "../../../src/services/timeout.service";
import { durationToSeconds } from "../../../src/utils/dates.utils";
import { MockInteraction } from "../../test-utils";

const mockedTimeoutService = jest.mocked(timeoutService);
const mockedDurationToSeconds = jest.mocked(durationToSeconds);

let mock: MockInteraction;

beforeEach(() => mock = new MockInteraction(timeoutImmunitySpec));

const mockUser = {
  id: "123456789",
} as User;

function expectServiceNotCalled(): void {
  expect(mockedTimeoutService.grantImmunity).not.toHaveBeenCalled();
  expect(mockedTimeoutService.isImmune).not.toHaveBeenCalled();
  expect(mockedTimeoutService.revokeImmunity).not.toHaveBeenCalled();
}

it("should require privilege level >= ALPHA_MOD", async () => {
  mock
    .mockCaller({ roleIds: [config.BABY_MOD_RID] })
    .mockOption("Boolean", "immune", true)
    .mockOption<User>("User", "user", mockUser);

  await mock.simulateCommand();

  mock.expectRepliedWith({
    content: expect.stringContaining("ALPHA_MOD"), // Some mention of it.
    ephemeral: true,
  });
  expectServiceNotCalled();
});

it("should grant immunity", async () => {
  mock
    .mockCaller({ roleIds: [config.ALPHA_MOD_RID] })
    .mockOption("Boolean", "immune", true)
    .mockOption<User>("User", "user", mockUser)
    .mockOption("String", "duration", "DUMMY-DURATION");

  const dummyDate = new Date(42);
  const dateSpy = jest.spyOn(global, "Date");
  dateSpy.mockImplementation(() => dummyDate);
  mockedDurationToSeconds.mockReturnValueOnce(600);

  await mock.simulateCommand();

  dateSpy.mockRestore();
  const expectedExpiration = new Date(42 + 600 * 1000);
  const responseMatcher = new Matcher<string>(value => {
    const requirements = [
      userMention(mockUser.id),
      time(expectedExpiration),
      time(expectedExpiration, TimestampStyles.RelativeTime),
    ] as const;
    return requirements.every(s => value.includes(s));
  }, "content matcher");

  mock.expectRepliedWith({
    content: responseMatcher as any,
    allowedMentions: expect.objectContaining({ parse: [] }),
  });
  expect(mockedTimeoutService.grantImmunity).toHaveBeenCalledWith(
    mockUser.id,
    expectedExpiration,
  );
});

it("should revoke immunity", async () => {
  mock
    .mockCaller({ roleIds: [config.ALPHA_MOD_RID] })
    .mockOption("Boolean", "immune", false)
    .mockOption<User>("User", "user", mockUser);

  await mock.simulateCommand();

  mock.expectRepliedWith({
    content: expect.stringContaining(userMention(mockUser.id)),
    allowedMentions: expect.objectContaining({ parse: [] }),
  });
  expect(mockedTimeoutService.revokeImmunity).toHaveBeenCalledWith(mockUser.id);
});
