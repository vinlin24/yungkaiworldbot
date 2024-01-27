import { Collection } from "discord.js";

import { PerIDSpamTracker } from "../utils/algorithms.utils";

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
