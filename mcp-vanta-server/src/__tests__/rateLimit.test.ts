import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RateLimiter } from "../rateLimit.js";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const limiter = new RateLimiter(3, 1000);
    expect(() => limiter.check()).not.toThrow();
    expect(() => limiter.check()).not.toThrow();
    expect(() => limiter.check()).not.toThrow();
  });

  it("rejects requests over the limit", () => {
    const limiter = new RateLimiter(2, 1000);
    limiter.check();
    limiter.check();
    expect(() => limiter.check()).toThrow(/Rate limit exceeded/);
  });

  it("resets after the window expires", () => {
    const limiter = new RateLimiter(2, 1000);
    limiter.check();
    limiter.check();
    expect(() => limiter.check()).toThrow();

    vi.advanceTimersByTime(1001);

    expect(() => limiter.check()).not.toThrow();
  });

  it("slides the window correctly", () => {
    const limiter = new RateLimiter(2, 1000);

    limiter.check(); // t=0
    vi.advanceTimersByTime(600);
    limiter.check(); // t=600

    // At t=600, both requests are within the 1000ms window
    expect(() => limiter.check()).toThrow();

    // At t=1001, the first request has expired
    vi.advanceTimersByTime(401);
    expect(() => limiter.check()).not.toThrow();
  });

  it("includes limit info in error message", () => {
    const limiter = new RateLimiter(5, 60000);
    for (let i = 0; i < 5; i++) limiter.check();

    expect(() => limiter.check()).toThrow("max 5 requests per 60s");
  });
});
