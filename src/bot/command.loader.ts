import fs from "node:fs";
import path from "node:path";

import { ValidationError, fromZodError } from "zod-validation-error";

import getLogger from "../logger";
import { CommandSpec, commandSpecSchema } from "../types/command.types";
import { dynamicRequire } from "../utils/meta.utils";

const log = getLogger(__filename);

export class CommandLoader {
  constructor(
    /**
     * Path to the root directory containing custom command modules.
     */
    private commandsBaseDirectoryPath: string,
  ) { }

  private discoverCommandFiles(
    directory: string = this.commandsBaseDirectoryPath,
  ): string[] {
    const commandPaths: string[] = [];

    const contents = fs.readdirSync(directory);
    for (const file of contents) {
      const fullPath = path.join(directory, file);

      // Recursive case: file is a directory.
      if (fs.lstatSync(fullPath).isDirectory()) {
        const innerCommandPaths = this.discoverCommandFiles(fullPath);
        commandPaths.push(...innerCommandPaths);
        continue;
      }

      // Base case: file is a controller file.
      if (file.endsWith(".command.js") || file.endsWith("command.ts")) {
        commandPaths.push(fullPath);
        log.debug(
          "discovered command implementation file: " +
          `${path.relative(this.commandsBaseDirectoryPath, fullPath)}.`,
        );
        continue;
      }
    }

    return commandPaths;
  }

  private validateImport(spec: unknown): ValidationError | null {
    const result = commandSpecSchema.safeParse(spec);
    if (!result.success) {
      return fromZodError(result.error);
    }
    return null;
  }

  public async load(): Promise<CommandSpec[]> {
    const specs: CommandSpec[] = [];
    const commandPaths = this.discoverCommandFiles();

    for (const fullPath of commandPaths) {
      const module = await dynamicRequire(fullPath);
      const commandSpec = module.default;
      const validationError = this.validateImport(commandSpec);
      if (validationError) {
        log.crit(`failed to import command module ${fullPath}.`);
        throw validationError;
      }
      specs.push(commandSpec as CommandSpec);
    }

    return specs;
  }
}
