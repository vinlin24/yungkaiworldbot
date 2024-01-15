import { GuildMember, Role } from "discord.js";

/**
 * Wrapper of `Object.entries(enumerable)` that preserves the key type of
 * `enumerable`. This gets around the problem where TypeScript always assumes
 * the key type is `string`. Example usage:
 *
 *    ```
 *    let mapping: Record<SomeEnum, number>;
 *    // ...
 *    for (const [member, num] of iterateEnum(mapping)) {
 *      // member is typed as SomeEnum instead of string.
 *    }
 *    ```
 *
 * NOTE: This doesn't seem to work as expected! When iterating over a numeric
 * enum, the numbers seem to be included as part of the keys.
 */
export function iterateEnum<T extends object>(enumerable: T)
  : [keyof T, T[keyof T]][] {
  return Object.entries(enumerable) as [keyof T, T[keyof T]][];
}

/**
 * Resolve a mentionable into an array of member objects.
 */
export function getAllMembers(mentionable: GuildMember | Role): GuildMember[] {
  if (mentionable instanceof GuildMember) return [mentionable];
  return Array.from(mentionable.members.values());
}

/**
 * Get all possible permutations of size 2 of `array`.
 */
export function getAllPermute2<T>(array: T[]): [T, T][] {
  const combinations: [T, T][] = [];
  for (let i = 0; i < array.length; i++) {
    for (let j = 0; j < array.length; j++) {
      if (i === j) continue;
      combinations.push([array[i], array[j]]);
    }
  }
  return combinations;
}

type HashableKey = number | string | boolean | bigint | null | undefined;

/**
 * Return whether two iterables contain the same elements, ignoring order.
 */
export function unorderedEquals<T extends HashableKey>(
  iterable1: Iterable<T>,
  iterable2: Iterable<T>,
): boolean {
  const set1 = new Set(iterable1);
  const set2 = new Set(iterable2);
  if (set1.size !== set2.size) {
    return false;
  }
  for (const element of set1) {
    if (!set2.has(element)) {
      return false;
    }
  }
  return true;
}
