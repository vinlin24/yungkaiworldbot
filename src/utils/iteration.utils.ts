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
 */
export function iterateEnum<T extends {}>(enumerable: T)
  : [keyof T, T[keyof T]][] {
  return Object.entries(enumerable) as [keyof T, T[keyof T]][];
}
