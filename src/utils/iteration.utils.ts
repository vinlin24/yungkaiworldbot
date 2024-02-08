import { GuildMember, Role } from "discord.js";

/**
 * Iterate over the [key, value] pairs of a TypeScript enum. One cannot use
 * `Object.entries()` directly because this would include pairs corresponding to
 * the reverse mapping generated at runtime. Note that this function does not
 * work with `const enum`s for obvious reasons.
 *
 *    ```
 *    enum Mapping {
 *      // ...
 *    }
 *    for (const [key, value] of iterateEnum(Mapping)) {
 *      // ...
 *    }
 *    ```
 */
export function iterateEnum<T extends object>(
  enumerable: T,
): [keyof T, T[keyof T]][] {
  // Ref: https://blog.logrocket.com/iterate-over-enums-typescript/#for-loops
  function getEnumKeysOnly() {
    // This includes the enum keys AND values (due to enums becoming reverse
    // mappings at runtime).
    const allKeys = Object.keys(enumerable);
    // Preserve only the enum keys.
    const enumKeysOnly = allKeys.filter(k => isNaN(Number(k)));
    return enumKeysOnly as (keyof T)[];
  }

  const keys = getEnumKeysOnly();
  return keys.map(key => [key, enumerable[key]]);
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
