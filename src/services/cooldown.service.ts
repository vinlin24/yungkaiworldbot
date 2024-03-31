import { Collection } from "discord.js";

import { CooldownManager } from "../middleware/cooldown.middleware";

export class CooldownService {
  private managers = new Collection<string, CooldownManager>();

  public getManager(id: string): CooldownManager | null {
    return this.managers.get(id) ?? null;
  }

  public setManager(id: string, manager: CooldownManager): void {
    this.managers.set(id, manager);
  }
}

export default new CooldownService();
