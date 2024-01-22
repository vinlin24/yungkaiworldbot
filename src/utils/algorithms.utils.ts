/**
 * Implements an algorithm for rate-limiting.
 *
 * See: https://en.wikipedia.org/wiki/Token_bucket
 */
export class TokenBucket<Rate extends number, Capacity extends number> {
  /** Current number of tokens in the bucket. */
  private tokens = 0;
  /** Timestamp of the last token refill */
  private lastRefill = Date.now();
  constructor(
    /**
     * Tokens to refill per second. Equivalent to the number of actions
     * permitted per second.
     */
    public readonly rate: Rate,
    /**
     * Maximum tokens in the bucket. Equivalent to the burst allowance; that is,
     * how many actions the consumer can execute at once before exceeding the
     * rate limit.
     */
    public readonly capacity: Capacity,
  ) {
    if (this.rate <= 0) {
      throw new RangeError("rate should be positive");
    }
    if (this.capacity <= 0) {
      throw new RangeError("capacity should be positive");
    }
  }

  /**
   * Take some kind of action that should be rate-limited. Return whether the
   * action is allowed i.e. false means the action has exceeded its rate limit
   * and is not prohibited.
   */
  public consume(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /**
   * Refill the bucket with tokens based on how much time has elapsed since the
   * last refill.
   */
  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    const newTokens = Math.round(this.tokens + elapsedSeconds * this.rate);
    this.tokens = Math.min(this.capacity, newTokens);
    this.lastRefill = now;
  }
}
