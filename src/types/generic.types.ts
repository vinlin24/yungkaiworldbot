// Utilities for TypeScript generics.


/**
 * Return `T` with the keys included in `K` made required.
 *
 * Example:
 *
 *    ```
 *    type VerifiedPerson = RequireKeys<Person, "name" | "color">;
 *    ```
 *
 * Ref: https://stackoverflow.com/a/66680470/14226122
 */
export type RequireKeys<T extends object, K extends keyof T> =
  (Required<Pick<T, K>> & Omit<T, K>) extends
  infer O ? { [P in keyof O]: O[P] } : never;

/**
 * Discriminated union for a result-error pair returned by a typical service
 * function.
 */
export type ResultPair<ResultType, ErrorType extends Error = Error> = Promise<
  | [ResultType, null]
  | [null, ErrorType]
>;
