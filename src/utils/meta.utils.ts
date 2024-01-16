import child_process from "node:child_process";

import getLogger from "../logger";

const log = getLogger(__filename);

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

/**
 * Get the current Git branch name. Return `null` if the Git command fails,
 * likely because no repository was detected.
 */
export function getCurrentBranchName(): string | null {
  const command = "git rev-parse --abbrev-ref HEAD";
  const process = child_process.spawnSync(command, { shell: true });
  if (process.status !== 0) {
    const stderr = process.stderr?.toString().trim();
    log.warning(
      `\`${command}\` failed with exit code ${process.status}` +
      (stderr ? `: ${stderr}` : ""),
    );
    return null;
  }
  return process.stdout.toString().trim();
}
