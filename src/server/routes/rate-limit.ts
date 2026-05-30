/**
 * Rate limiting helpers extracted during Phase 1 server modular split.
 */
export function createRateLimiter(windowMs: number, max: number) {
  const requests = new Map<string, number[]>();

  return (key: string) => {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!requests.has(key)) requests.set(key, []);
    const times = requests.get(key)!;

    // Remove old requests
    while (times.length > 0 && times[0] < windowStart) {
      times.shift();
    }

    if (times.length >= max) {
      return false; // rate limited
    }

    times.push(now);
    return true;
  };
}
