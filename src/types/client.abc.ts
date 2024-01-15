import child_process from "node:child_process";

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

function getCurrentBranchName(): string | null {
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

export abstract class IClientWithIntentsAndRunners extends Client {
  public abstract readonly commandRunners
    : Collection<string, CommandRunner>;
  public abstract readonly listenerRunners
    : Collection<string, ListenerRunner<any>>;

  /**
   * The timestamp since when the bot has been ready. This is to be set by the
   * client ready event listener handler.
   */
  public readySince?: Date;

  /**
   * Name of the Git branch that was checked out when this program was started.
   * This value is `null` if no Git repository is detected.
   */
  public readonly branchName = getCurrentBranchName();

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
}
