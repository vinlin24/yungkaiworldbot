/**
 * Return a random integer in the inclusive range [`lower`, `upper`].
 */
export function randRange(lower: number, upper: number): number {
  if (!Number.isInteger(lower)) {
    throw new RangeError(`bounds must be integers, received lower=${lower}`);
  }
  if (!Number.isInteger(upper)) {
    throw new RangeError(`bounds must be integers, received upper=${upper}`);
  }
  if (lower > upper) {
    throw new RangeError(`lower=${lower} is not lower than upper=${upper}`);
  }
  const range = upper - lower + 1;
  return Math.floor(Math.random() * range) + lower;
}
