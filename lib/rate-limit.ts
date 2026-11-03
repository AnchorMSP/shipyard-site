import { NextRequest } from "next/server";
import { kv } from "@vercel/kv";

const WINDOW_MINUTES = 15;

export const RATE_LIMITS = {
  signup: { limit: 10, windowSeconds: WINDOW_MINUTES * 60 },
  login: { limit: 20, windowSeconds: WINDOW_MINUTES * 60 },
  vote: { limit: 30, windowSeconds: 10 * 60 },
  comment: { limit: 10, windowSeconds: WINDOW_MINUTES * 60 },
} as const;

export type RateLimitScope = keyof typeof RATE_LIMITS;

/** Best available client IP from the headers Vercel sets at the edge. */
export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}

/**
 * True when the counter bucket is still within its limit. The bucket is created
 * with its TTL atomically so a failed request can never leak a permanent block.
 * Fails open when KV is unreachable so a storage blip does not take down auth.
 */
async function withinLimit(bucket: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const created = await kv.set(bucket, 1, { nx: true, ex: windowSeconds });
    const count = created === null ? await kv.incr(bucket) : 1;
    return count <= limit;
  } catch (error) {
    console.error("Rate limit check failed:", error);
    return true;
  }
}

/** Per-client-IP rate limit for a request scope. */
export async function allowRequest(request: NextRequest, scope: RateLimitScope): Promise<boolean> {
  const { limit, windowSeconds } = RATE_LIMITS[scope];
  return withinLimit(`ratelimit:${scope}:${clientIp(request)}`, limit, windowSeconds);
}

/** Per-user rate limit for an authenticated action. */
export async function allowUserRequest(userId: string, scope: RateLimitScope): Promise<boolean> {
  const { limit, windowSeconds } = RATE_LIMITS[scope];
  return withinLimit(`ratelimit:${scope}:user:${userId}`, limit, windowSeconds);
}