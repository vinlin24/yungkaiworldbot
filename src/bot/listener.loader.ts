import fs from "node:fs";
import path from "node:path";

import { ValidationError, fromZodError } from "zod-validation-error";

import getLogger from "../logger";
import { ListenerSpec, listenerSpecSchema } from "../types/listener.types";

const log = getLogger(__filename);

export class ListenerLoader {
  constructor(
    /**
     * Path to root directory containing custom event listener modules.
     */
    private listenersBaseDirectoryPath: string,
    /**
     * Path to the directory containing event listener modules special to the
     * bot itself.
     */
    private specialListenersDirectoryPath: string,
  ) { }

  private discoverSpecialListenerFiles(): string[] {
    const specialListenerPaths: string[] = [];
    const contents = fs.readdirSync(this.specialListenersDirectoryPath);
    for (const file of contents) {
      const fullPath = path.join(this.specialListenersDirectoryPath, file);
      specialListenerPaths.push(fullPath);
      log.debug(`discovered special event listener file: ${file}.`);
    }
    return specialListenerPaths;
  }

  private discoverListenerFiles(
    directory: string = this.listenersBaseDirectoryPath,
  ): string[] {
    const listenerPaths: string[] = [];

    // Prepend the listeners special to the bot itself.
    listenerPaths.push(...this.discoverSpecialListenerFiles());

    const contents = fs.readdirSync(directory);
    for (const file of contents) {
      const fullPath = path.join(directory, file);

      // Recursive case: file is a directory.
      if (fs.lstatSync(fullPath).isDirectory()) {
        const innerCommandPaths = this.discoverListenerFiles(fullPath);
        listenerPaths.push(...innerCommandPaths);
        continue;
      }

      // Base case: file is a controller file.
      if (file.endsWith(".listener.js") || file.endsWith("listener.ts")) {
        listenerPaths.push(fullPath);
        log.debug(
          "discovered command implementation file: " +
          `${path.relative(this.listenersBaseDirectoryPath, fullPath)}.`
        );
        continue;
      }
    }

    return listenerPaths;
  }

  private validateImport(spec: unknown): ValidationError | null {
    const result = listenerSpecSchema.safeParse(spec);
    if (!result.success) {
      return fromZodError(result.error);
    }
    return null;
  }

  public load(): ListenerSpec<any>[] {
    const specs: ListenerSpec<any>[] = [];
    const listenerPaths = this.discoverListenerFiles();

    for (const fullPath of listenerPaths) {
      const listenerSpec = require(fullPath).default as unknown;
      const validationError = this.validateImport(listenerSpec);
      if (validationError) {
        log.crit(`failed to import listener module ${fullPath}.`);
        throw validationError;
      }
      specs.push(listenerSpec as ListenerSpec<any>);
    }

    return specs;
  }
}
