import { Collection, userMention } from "discord.js";

import getLogger from "../logger";

const log = getLogger(__filename);

export class TimeoutService {
  /** UID-to-expiration mapping of members temporarily immune to timeouts. */
  private immunities = new Collection<string, Date>();

  public grantImmunity(uid: string, until: Date): void {
    this.immunities.set(uid, until);
    log.info(`granted ${userMention(uid)} timeout immunity until ${until}.`);
  }

  public isImmune(uid: string): boolean {
    const now = new Date();
    const expiration = this.immunities.get(uid);
    if (!expiration) {
      return false;
    }
    const expired = expiration < now;
    if (expired) {
      this.immunities.delete(uid);
      log.debug(`removed expired immunity expiration for ${userMention(uid)}.`);
    }
    return !expired;
  }

  public revokeImmunity(uid: string): void {
    this.immunities.delete(uid);
    log.info(`revoked timeout immunity from ${userMention(uid)}.`);
  }

  public listImmunities(): Collection<string, Date> {
    const now = new Date();
    return this.immunities.filter(expiration => expiration < now);
  }
}

export default new TimeoutService();
