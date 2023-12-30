import { Client, Collection, GatewayIntentBits } from "discord.js";

import { CommandRunner } from "../bot/command.runner";
import { ListenerRunner } from "../bot/listener.runner";
import getLogger from "../logger";

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

  public registerListeners(): void {
    for (const [id, runner] of this.listenerRunners) {
      if (runner.spec.once) {
        this.once(runner.spec.type, runner.callbackToRegister);
      } else {
        this.on(runner.spec.type, runner.callbackToRegister);
      }
      log.debug(`registered event listener '${id}'.`);
    }
  }
}
