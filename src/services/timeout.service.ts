import { Collection, userMention } from "discord.js";

import getLogger from "../logger";
import { TokenBucket } from "../utils/algorithms.utils";

const log = getLogger(__filename);

export class TimeoutService {
  /** UID-to-expiration mapping of members temporarily immune to timeouts. */
  private immunities = new Collection<string, Date>();
  /**
   * Mapping of UID to rate-limit manager to prevent spamming of timeouts.
   *
   * - rate=0.1: Regain 1 timeout quota every 10 seconds.
   * - capacity=3: Time out at most 3 users in quick succession.
   */
  private spamTracker = new Collection<string, TokenBucket<0.1, 3>>();

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
    return this.immunities.filter(expiration => expiration > now);
  }

  /**
   * Report a timeout issued event. Return whether the timeout is within the
   * rate limit. That is, return false if the timeout has exceeded the rate
   * limit and thus punishment should be issued.
   */
  public reportIssued(executorId: string): boolean {
    let bucket = this.spamTracker.get(executorId);
    if (!bucket) {
      bucket = new TokenBucket(0.1, 3);
      this.spamTracker.set(executorId, bucket);
    }
    return bucket.consume();
  }
}

export default new TimeoutService();
