/**
 * Similar to `require()`, but using the most updated version of the module
 * instead of the cached copy.
 */
export async function dynamicRequire<
  ModuleType extends { default: unknown } = { default: unknown }
>(modulePath: string): Promise<ModuleType> {
  // Remove the module from the cache.
  delete require.cache[require.resolve(modulePath)];

  // Use dynamic import to get the updated version.
  return import(modulePath);
}
