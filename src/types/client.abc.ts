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
import { getCurrentBranchName } from "../utils/meta.utils";
import { ListenerFilter } from "./listener.types";

const log = getLogger(__filename);

export abstract class ClientWithIntentsAndRunnersABC extends Client {
  public readonly commandRunners
    = new Collection<string, CommandRunner>();
  public readonly listenerRunners
    = new Collection<string, ListenerRunner<any>>();

  /**
   * The timestamp since when the bot has been ready. This is to be set by the
   * client ready event listener handler.
   */
  public readySince?: Date;

  /**
   * Name of the Git branch that was checked out when this program was started.
   * This value is `null` if no Git repository is detected.
   */
  public branchName = getCurrentBranchName();

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.DirectMessages,
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
    if (!runner.spec.filters) runner.spec.filters = [ignoreSelf];
    else runner.spec.filters.push(ignoreSelf);
  }

  public registerListeners(): void {
    for (const [id, runner] of this.listenerRunners) {
      if (runner.spec.type === Events.MessageCreate) {
        this.enforceIgnoreOwnMessages(runner);
      }

      if (runner.spec.once) {
        this.once(runner.spec.type, runner.callbackToRegister);
      }
      else {
        this.on(runner.spec.type, runner.callbackToRegister);
      }
      log.debug(`registered event listener '${id}'.`);
    }
  }

  /**
   * Perform any loading and initialization necessary for bot startup. It is
   * expected that after this method is called, the bot is in a well-defined
   * state to log in and start its main event loop. Return whether the operation
   * succeeded.
   */
  public abstract prepareRuntime(): Promise<boolean>;
  /**
   * Load command definitions and deploy them to Discord's backend. It is
   * expected that this method does NOT start the bot's main runtime.
   */
  public abstract deploySlashCommands(): Promise<void>;
  /**
   * Undo the setup from `prepareRuntime`.
   */
  public abstract clearDefinitions(): Promise<void>;
}
