import "server-only";

export type RateLimitPolicy = {
  key: string;
  max: number;
  windowMs: number;
  blockMs?: number;
};

type Bucket = {
  count: number;
  resetAt: number;
  blockedUntil: number;
  strikes: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __devilFruitRateLimitStore: Map<string, Bucket> | undefined;
  // eslint-disable-next-line no-var
  var __devilFruitRateLimitChecks: number | undefined;
}

const store = globalThis.__devilFruitRateLimitStore ?? new Map<string, Bucket>();
globalThis.__devilFruitRateLimitStore = store;
globalThis.__devilFruitRateLimitChecks ??= 0;

function stableHash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return Math.abs(h >>> 0).toString(16);
}

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || req.headers.get("cf-connecting-ip") || "";
  const ip = xff.split(",")[0]?.trim();
  if (ip) return ip;

  const ua = req.headers.get("user-agent") || "unknown-ua";
  return `ua:${stableHash(ua).slice(0, 10)}`;
}

function isLikelyFirstParty(req: Request): boolean {
  const secFetchSite = (req.headers.get("sec-fetch-site") || "").toLowerCase();
  if (secFetchSite === "same-origin" || secFetchSite === "same-site") return true;

  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      return originHost === host;
    } catch {
      return false;
    }
  }

  return false;
}

function maybeGarbageCollect(now: number) {
  globalThis.__devilFruitRateLimitChecks = (globalThis.__devilFruitRateLimitChecks || 0) + 1;
  if ((globalThis.__devilFruitRateLimitChecks || 0) % 250 !== 0) return;

  for (const [k, bucket] of store.entries()) {
    if (bucket.resetAt + 15 * 60 * 1000 < now && bucket.blockedUntil < now) {
      store.delete(k);
    }
  }
}

export type RateLimitCheckResult = {
  ok: boolean;
  headers: Record<string, string>;
  retryAfterSec: number;
  effectiveMax: number;
};

export function checkRateLimit(req: Request, policy: RateLimitPolicy): RateLimitCheckResult {
  const now = Date.now();
  maybeGarbageCollect(now);

  const firstParty = isLikelyFirstParty(req);
  const effectiveMax = firstParty ? policy.max : Math.max(8, Math.floor(policy.max * 0.35));

  const ip = getClientIp(req);
  const bucketKey = `${policy.key}:${ip}`;

  const previous = store.get(bucketKey);
  const active: Bucket =
    previous && previous.resetAt > now
      ? previous
      : {
          count: 0,
          resetAt: now + policy.windowMs,
          blockedUntil: 0,
          strikes: previous?.strikes || 0,
        };

  if (active.blockedUntil > now) {
    const retryAfterSec = Math.max(1, Math.ceil((active.blockedUntil - now) / 1000));
    return {
      ok: false,
      retryAfterSec,
      effectiveMax,
      headers: {
        "X-RateLimit-Limit": String(effectiveMax),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(active.resetAt / 1000)),
        "Retry-After": String(retryAfterSec),
      },
    };
  }

  active.count += 1;

  if (active.count > effectiveMax) {
    active.strikes += 1;

    const baseBlockMs = policy.blockMs || 60_000;
    const strikeMultiplier = Math.min(8, Math.max(1, active.strikes));
    active.blockedUntil = now + baseBlockMs * strikeMultiplier;

    store.set(bucketKey, active);

    const retryAfterSec = Math.max(1, Math.ceil((active.blockedUntil - now) / 1000));

    return {
      ok: false,
      retryAfterSec,
      effectiveMax,
      headers: {
        "X-RateLimit-Limit": String(effectiveMax),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(active.resetAt / 1000)),
        "Retry-After": String(retryAfterSec),
      },
    };
  }

  store.set(bucketKey, active);

  const remaining = Math.max(0, effectiveMax - active.count);

  return {
    ok: true,
    retryAfterSec: 0,
    effectiveMax,
    headers: {
      "X-RateLimit-Limit": String(effectiveMax),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(Math.ceil(active.resetAt / 1000)),
    },
  };
}
