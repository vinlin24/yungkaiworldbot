import { Collection } from "discord.js";
import { TokenBucket } from "../utils/algorithms.utils";

// TODO: Move this to a helper file?
class PerIDSpamTracker<
  Rate extends number,
  Capacity extends number,
> {
  protected buckets = new Collection<string, TokenBucket<Rate, Capacity>>();
  constructor(
    protected readonly rate: Rate,
    protected readonly capacity: Capacity,
  ) { }

  /**
   * Consume a token for the rate limiter for some event for the given ID.
   * Return whether the event is still within the rate limit.
   */
  public reportEvent(id: string): boolean {
    let bucket = this.buckets.get(id);
    if (!bucket) {
      bucket = new TokenBucket(this.rate, this.capacity);
      this.buckets.set(id, bucket);
    }
    return bucket.consume();
  }
}

export class MentionSpamService {
  private spamTrackers = new Collection<string, PerIDSpamTracker<0.1, 3>>();

  /**
   * Report a mention event. Return whether this event is still within the rate
   * limit.
   */
  public mentioned(mentionerId: string, mentionedId: string): boolean {
    let tracker = this.spamTrackers.get(mentionerId);
    if (!tracker) {
      tracker = new PerIDSpamTracker(0.1, 3);
      this.spamTrackers.set(mentionerId, tracker);
    }
    return tracker.reportEvent(mentionedId);
  }
}

export default new MentionSpamService();
