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
export function iterateEnum<T extends {}>(enumerable: T)
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
