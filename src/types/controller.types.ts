import { Command } from "./command.types";
import { Listener } from "./listener.types";

export * from "./command.types";
export * from "./listener.types";

export type Controller = {
  name: string;
  commands: readonly Command[];
  listeners: readonly Listener<any>[];
};