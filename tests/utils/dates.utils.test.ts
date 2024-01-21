import {
  TIME_UNITS,
  addDateSeconds,
  durationToSeconds,
  formatHoursMinsSeconds,
  toUnixSeconds,
} from "../../src/utils/dates.utils";

describe("add seconds to a Date", () => {
  it("should return a new, correct Date", () => {
    const original = new Date();
    const added = addDateSeconds(original, 300);
    expect(added.getTime()).toEqual(original.getTime() + 300 * 1000);
  });
});

describe("convert Date to Unix time", () => {
  it("should return the Unix timestamp", () => {
    const date = new Date();
    const seconds = toUnixSeconds(date);
    const convertedBack = new Date(seconds * 1000);
    // Delta of 0.5 sec to tolerate rounding needed when dividing ms -> sec.
    const DELTA_MS = 500;
    const msDiff = Math.abs(convertedBack.getTime() - date.getTime());
    expect(msDiff).toBeLessThanOrEqual(DELTA_MS);
  });
});

describe("format hours, minutes, seconds from seconds value", () => {
  it("should work with 0 seconds", () => {
    const formatted = formatHoursMinsSeconds(0);
    expect(formatted).toEqual("0 seconds");
  });

  it("should only show seconds when less than 1 minute", () => {
    const formatted = formatHoursMinsSeconds(42);
    expect(formatted).toEqual("42 seconds");
  });

  it("should show only minutes when multiple of 60 less than 1 hour", () => {
    const formatted = formatHoursMinsSeconds(600);
    expect(formatted).toEqual("10 minutes");
  });

  it("should show only hours when multiple of 3600", () => {
    const formatted = formatHoursMinsSeconds(7200);
    expect(formatted).toEqual("2 hours");
  });

  it("should overflow to minutes when greater than 1 minute", () => {
    const formatted = formatHoursMinsSeconds(325);
    expect(formatted).toEqual("5 minutes, 25 seconds");
  });

  it("should overflow to hours when greater than 1 hour", () => {
    const formatted = formatHoursMinsSeconds(7400);
    expect(formatted).toEqual("2 hours, 3 minutes, 20 seconds");
  });

  it("should omit seconds when only hours and minutes are needed", () => {
    const formatted = formatHoursMinsSeconds(7500);
    expect(formatted).toEqual("2 hours, 5 minutes");
  });

  it("should omit minutes when only hours and seconds are needed", () => {
    const formatted = formatHoursMinsSeconds(7242);
    expect(formatted).toEqual("2 hours, 42 seconds");
  });

  it("should properly handle singular nouns", () => {
    const formatted = formatHoursMinsSeconds(3661);
    expect(formatted).toEqual("1 hour, 1 minute, 1 second");
  });
});

describe("converting duration to seconds", () => {
  for (const [unit, multiplier] of Object.entries(TIME_UNITS)) {
    it(`should use ${unit}s if units are omitted`, () => {
      const secs = durationToSeconds("420", unit as keyof typeof TIME_UNITS);
      expect(secs).toEqual(420 * multiplier);
    });
  }

  it("should return null if the duration is unparseable", () => {
    const result = durationToSeconds("lorem ipsum");
    expect(result).toEqual(null);
  });

  // The "internal" cases where we're just testing if the duration is converted
  // to the correct number of seconds doesn't need to be tested because that's
  // up the parse-duration dependency.
});
