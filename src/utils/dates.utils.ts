import parseDuration from "parse-duration";

import getLogger from "../logger";

const log = getLogger(__filename);

/**
 * Return a new `Date` object whose timestamp is `seconds` seconds after now.
 */
export function addDateSeconds(seconds: number): Date;
/**
 * Return a new `Date` object whose timestamp is `seconds` seconds after the
 * provided `date`.
 */
export function addDateSeconds(date: Date, seconds: number): Date;

export function addDateSeconds(arg1: Date | number, arg2?: number): Date {
  let date: Date;
  let seconds: number;

  if (typeof arg1 === "number") {
    date = new Date();
    seconds = arg1;
  }
  else {
    date = arg1;
    seconds = arg2!;
  }

  const newDate = new Date(date);
  newDate.setSeconds(newDate.getSeconds() + seconds);
  return newDate;
}

export function toUnixSeconds(date: Date): number {
  // The underlying number in JavaScript Dates is in milliseconds.
  const seconds = Math.round(date.getTime() / 1000);
  return seconds;
}

/**
 * Convert a number of seconds to a human-readable string mentioning hours,
 * minutes, and/or seconds as needed. For example, 3730 seconds returns "1 hour,
 * 2 minutes, 10 seconds".
 */
export function formatHoursMinsSeconds(seconds: number): string {
  function formatHours(): string {
    const hours = Math.floor(seconds / 3600);
    if (hours > 0) {
      const unit = hours === 1 ? "hour" : "hours";
      return `${hours} ${unit}`;
    }
    return "";
  }

  function formatMinutes(): string {
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    if (remainingMinutes > 0) {
      const unit = remainingMinutes === 1 ? "minute" : "minutes";
      return `${remainingMinutes} ${unit}`;
    }
    return "";
  }

  function formatSeconds(): string {
    const remainingSeconds = seconds % 60;
    if (remainingSeconds > 0) {
      const unit = remainingSeconds === 1 ? "second" : "seconds";
      return `${remainingSeconds} ${unit}`;
    }
    return "";
  }

  const formattedTime = [
    formatHours(),
    formatMinutes(),
    formatSeconds(),
  ].filter(Boolean).join(", ");

  return formattedTime || "0 seconds";
}

/**
 * Round a number of milliseconds to the nearest multiple of one minute. The
 * number returned is also in milliseconds.
 */
export function roundMsecToNearestMinute(msec: number): number {
  const minutes = Math.round(msec / (60 * 1000));
  return minutes * 60 * 1000; // Convert back to milliseconds.
}

/**
 * Mapping of time units to conversion factor to seconds.
 */
export const TIME_UNITS = {
  millsecond: 0.001,
  second: 1,
  minute: 60,
  hour: 3600,
  day: 86400,
  week: 604800,
} as const;

/**
 * Convert a human-readable duration string e.g. "10 min" to seconds.
 *
 * NOTE: If no unit is specified, assume it means seconds.
 */
export function durationToSeconds(
  humanReadableDuration: string,
  defaultUnit: keyof typeof TIME_UNITS = "second",
): number | null {
  // `parseDuration` seems to interpret lone numbers as msec, so a lone "10"
  // becomes 0.01 sec, which would get rejected to the confusion of the caller.
  const asNumber = Number(humanReadableDuration);
  if (!isNaN(asNumber)) {
    const multiplier = TIME_UNITS[defaultUnit];
    return asNumber * multiplier;
  }
  const seconds = parseDuration(humanReadableDuration, "sec");
  if (seconds === undefined) {
    log.debug(`failed to parse \`${humanReadableDuration}\` as a duration.`);
    return null;
  }
  return seconds;
}
