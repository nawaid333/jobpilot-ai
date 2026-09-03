type Bucket = { count: number; resetAt: number };

type RateLimitResult = { ok: true; remaining: number } | { ok: false; retryAfterSeconds: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: Math.max(0, limit - 1) };
  }
  if (current.count >= limit) return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  current.count += 1;
  return { ok: true, remaining: Math.max(0, limit - current.count) };
}

// Prevent an unbounded in-memory map when attackers rotate keys.
export function pruneRateLimitBuckets(maxEntries = 10_000) {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size <= maxEntries) return;
  const excess = buckets.size - maxEntries;
  let removed = 0;
  for (const key of buckets.keys()) {
    buckets.delete(key);
    if (++removed >= excess) break;
  }
}

export function rateLimitResponse(result: RateLimitResult) {
  if (result.ok) return null;
  return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": String(result.retryAfterSeconds) },
  });
}
