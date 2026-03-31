/**
 * Simple sliding-window rate limiter.
 * Tracks timestamps of recent requests and rejects if the window is full.
 */
export class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(): void {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);

    if (this.timestamps.length >= this.maxRequests) {
      throw new Error(
        `Rate limit exceeded: max ${this.maxRequests} requests per ${this.windowMs / 1000}s`,
      );
    }

    this.timestamps.push(now);
  }
}
