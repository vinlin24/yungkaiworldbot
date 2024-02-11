import fs from "node:fs";
import path from "node:path";

import { ValidationError, fromZodError } from "zod-validation-error";

import getLogger from "../logger";
import { ListenerSpec, listenerSpecSchema } from "../types/listener.types";
import { dynamicRequire } from "../utils/meta.utils";

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
    }
    return specialListenerPaths;
  }

  private discoverListenerFiles(
    directory: string = this.listenersBaseDirectoryPath,
  ): string[] {
    const listenerPaths: string[] = [];

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

  public async load(specialOnly?: boolean): Promise<ListenerSpec<any>[]> {
    const specs: ListenerSpec<any>[] = [];
    const customListenerPaths = this.discoverListenerFiles();
    const specialListenerPaths = this.discoverSpecialListenerFiles();

    const listenerPaths = specialOnly
      ? specialListenerPaths
      : [...specialListenerPaths, ...customListenerPaths];

    for (const fullPath of listenerPaths) {
      const module = await dynamicRequire(fullPath);
      const listenerSpec = module.default;
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
