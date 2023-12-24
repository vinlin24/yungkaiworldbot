/**
 * Return a new `Date` object whose timestamp is `seconds` seconds after the
 * provided `date`.
 */
export function addDateSeconds(date: Date, seconds: number): Date {
  const newDate = new Date(date);
  newDate.setSeconds(newDate.getSeconds() + seconds);
  return newDate;
}

export function toUnixSeconds(date: Date): number {
  // The underlying number in JavaScript Dates is in milliseconds.
  const seconds = Math.floor(date.getTime() / 1000);
  return seconds;
}

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
