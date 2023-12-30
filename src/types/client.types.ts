import { Client, Collection } from "discord.js";

import { CommandDispatcher } from "../bot/command.dispatcher";
import { ListenerDispatcher } from "../bot/listener.dispatcher";

export abstract class ClientWithDispatchers extends Client {
  public abstract readonly commandDispatchers
    : Collection<string, CommandDispatcher>;
  public abstract readonly listenerDispatchers
    : Collection<string, ListenerDispatcher<any>>;

  // TODO: Maybe listener dispatcher registration can go here?
}
