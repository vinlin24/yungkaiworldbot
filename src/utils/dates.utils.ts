/**
 * Return a new `Date` object whose timestamp is `seconds` seconds after the
 * provided `date`.
 */
export function addDateSeconds(date: Date, seconds: number): Date {
  const newDate = new Date(date);
  newDate.setSeconds(newDate.getSeconds() + seconds);
  return newDate;
}
