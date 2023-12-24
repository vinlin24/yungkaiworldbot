import { Command } from "./command.types";
import { Listener } from "./listener.types";

export * from "./command.types";
export * from "./listener.types";

// TODO: .name isn't used for anything at the moment. It may also be useful
// to have commands and listeners store a reference back to the controller for
// convenient lookup purposes.
export type Controller = {
  name: string;
  commands: readonly Command[];
  listeners: readonly Listener<any>[];
};
