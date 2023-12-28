
import { filterMessageListeners } from "../utils/iteration.utils";
import { Command } from "./command.types";
import { Listener } from "./listener.types";

export * from "./command.types";
export * from "./listener.types";

// TODO: .name isn't used for anything at the moment. It may also be useful
// to have commands and listeners store a reference back to the controller for
// convenient lookup purposes.
export type ControllerOptions = {
  name: string;
  commands: readonly Command[];
  listeners: readonly Listener<any>[];
};

export class Controller {
  public readonly name: string;
  public readonly commands: Command[];
  public readonly listeners: Listener<any>[];

  constructor(options: ControllerOptions) {
    this.name = options.name
    this.commands = [...options.commands];
    this.listeners = [...options.listeners];
  }

  /**
   * Automatically generate setter and override commands for the
   * `MessageListener`s currently tracked.
   */
  public withCooldownCommands = (): this => {
    const messageListeners = filterMessageListeners(this.listeners);
    for (const listener of messageListeners) {
      const setterCommand = listener.getCooldownSetter();
      const overriderCommand = listener.getCooldownOverrider();
      this.commands.push(setterCommand, overriderCommand);
    }
    return this;
  };
}
