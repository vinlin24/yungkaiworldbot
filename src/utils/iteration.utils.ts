import { GuildMember, Role } from "discord.js";
import { Listener, MessageListener } from "../types/listener.types";

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
export function iterateEnum<T extends {}>(enumerable: T)
  : [keyof T, T[keyof T]][] {
  return Object.entries(enumerable) as [keyof T, T[keyof T]][];
}

/**
 * Equivalent of Python's `zip()` for two arrays. Example usage:
 *
 *    ```
 *    const numbers = [1, 2, 3];
 *    const words = ['one', 'two', 'three'];
 *    const zipped = zip(numbers, words);
 *    console.log(zipped);
 *    // Output: [ [ 1, 'one' ], [ 2, 'two' ], [ 3, 'three' ] ]
 *    ```
 *
 * Attribution: ChatGPT.
 */
export function zip<T, U>(array1: T[], array2: U[]): [T, U][] {
  const length = Math.min(array1.length, array2.length);
  return Array.from({ length }, (_, index) => [array1[index], array2[index]]);
}

/**
 * Resolve a mentionable into an array of member objects.
 */
export function getAllMembers(mentionable: GuildMember | Role): GuildMember[] {
  if (mentionable instanceof GuildMember) return [mentionable];
  return Array.from(mentionable.members.values());
}

/**
 * Return just the `MessageListener` instances within an array of `Listener`s.
 */
export function filterMessageListeners(
  listeners: Iterable<Listener<any>>,
): MessageListener[] {
  return Array.from(listeners)
    .filter(listener => listener instanceof MessageListener)
    .map(listener => listener as MessageListener);
}
