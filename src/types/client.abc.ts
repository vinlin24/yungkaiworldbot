import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Message,
} from "discord.js";

import { CommandRunner } from "../bot/command.runner";
import { ListenerRunner } from "../bot/listener.runner";
import getLogger from "../logger";
import { ListenerFilter } from "./listener.types";

const log = getLogger(__filename);

export abstract class IClientWithIntentsAndRunners extends Client {
  public abstract readonly commandRunners
    : Collection<string, CommandRunner>;
  public abstract readonly listenerRunners
    : Collection<string, ListenerRunner<any>>;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });
    this.setMaxListeners(Infinity); // Pacify warning.
  }

  private isMessageFromSelf(message: Message): boolean {
    return message.author.id === this.user?.id;
  }

  /**
   * Specially enforce this policy: the bot is under no circumstances allowed to
   * listen to its own message creations. This is a simple way to prevent
   * accidental recursive spam without having to explicitly filter by message
   * author in every event listener implementation.
   *
   * TODO: This kind of seems like a code smell to inject a filter into
   * ListenerSpec#filters (secretly mutating shared state), but I don't know
   * what better way to do this at the moment.
   */
  private enforceIgnoreOwnMessages(
    runner: ListenerRunner<Events.MessageCreate>,
  ): void {
    const ignoreSelf: ListenerFilter<Events.MessageCreate> = {
      predicate: message => !this.isMessageFromSelf(message),
    };
    if (!runner.spec.filters)
      runner.spec.filters = [ignoreSelf]
    else
      runner.spec.filters.push(ignoreSelf);
  }

  public registerListeners(): void {
    for (const [id, runner] of this.listenerRunners) {
      if (runner.spec.type === Events.MessageCreate) {
        this.enforceIgnoreOwnMessages(runner);
      }

      if (runner.spec.once) {
        this.once(runner.spec.type, runner.callbackToRegister);
      } else {
        this.on(runner.spec.type, runner.callbackToRegister);
      }
      log.debug(`registered event listener '${id}'.`);
    }
  }
}
