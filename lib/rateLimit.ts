/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Adequate for a single-instance deployment; on multi-instance
 * serverless it becomes per-instance (still blunts abuse bursts).
 * Swap for Upstash/Redis if stronger guarantees are needed.
 */

type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    buckets.set(key, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: windowMs - (now - oldest),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);

  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) {
      if (b.hits.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }

  return {
    allowed: true,
    remaining: limit - bucket.hits.length,
    retryAfterMs: 0,
  };
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
