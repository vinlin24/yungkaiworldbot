jest.mock("../../../src/utils/dates.utils");

import { userMention } from "discord.js";

import countdownSpec from "../../../src/controllers/convenience/countdown.command";
import { formatHoursMinsSeconds } from "../../../src/utils/dates.utils";
import { MockInteraction } from "../../test-utils";

const mockedFormatHoursMinsSeconds = jest.mocked(formatHoursMinsSeconds);

let mock: MockInteraction;

beforeEach(() => {
  mock = new MockInteraction(countdownSpec);
  jest.useFakeTimers();
  jest.spyOn(global, "setTimeout");
  // formatHoursMinsSeconds is our own dependency, so we don't want to couple
  // countdown's correctness with its correctness. Just mock its return value.
  mockedFormatHoursMinsSeconds.mockReturnValue("DUMMY-FORMATTED-TIME");
});

afterEach(jest.useRealTimers);

describe("processing human-readable inputs", () => {
  const dummyUid = "123456789";

  // ARRANGE.
  function mockCalledWithDuration(humanReadableDuration: string): void {
    mock
      .mockCaller({ uid: dummyUid })
      .mockOption("String", "duration", humanReadableDuration);
  }

  // ASSERT.
  function expectCountdownSuccess(msec: number): void {
    mock.expectRepliedWith({
      // TODO: somehow check for the timestamp part?
      content: expect.stringContaining(
        "Counting down to DUMMY-FORMATTED-TIME from now.",
      ),
    });
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), msec);
    jest.runAllTimers();
    expect(mock.interaction.channel!.send).toHaveBeenCalledWith(
      `${userMention(dummyUid)}, your countdown has expired!`,
    );
  }

  const TEST_CASES: [string, number][] = [
    ["10s", 10 * 1000],
    ["2 min", 2 * 60 * 1000],
    ["5min 32sec", (5 * 60 + 32) * 1000],
  ] as const;

  for (const [humanReadableDuration, msec] of TEST_CASES) {
    it(`should accept ${humanReadableDuration}`, async () => {
      mockCalledWithDuration(humanReadableDuration);
      await mock.simulateCommand();
      expectCountdownSuccess(msec);
    });
  }

  it("should treat an input without units as seconds", async () => {
    mockCalledWithDuration("10");
    await mock.simulateCommand();
    expectCountdownSuccess(10 * 1000);
  });
});

describe("error handling", () => {
  it("should reject miniscule durations", async () => {
    mock.mockOption("String", "duration", "1");
    await mock.simulateCommand();
    mock.expectRepliedWith({ ephemeral: true });
    expect(setTimeout).not.toHaveBeenCalled();
  });

  it("should alert the caller if failed to parse duration", async () => {
    mock.mockOption("String", "duration", "lorem ipsum");
    await mock.simulateCommand();
    mock.expectRepliedWith({
      content: expect.stringContaining("lorem ipsum"), // Some mention of it.
      ephemeral: true,
    });
    expect(setTimeout).not.toHaveBeenCalled();
  });
});

// TODO: Add a testEphemeralOption that mirrors testBroadcastOption.
