import { writeJson } from "./justtcg-utils.mjs";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const TCGPLAYER_DETAILS_BASE_URL = "https://mp-search-api.tcgplayer.com/v1/product";

function normalizeEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  if ("fetched_at" in entry) return entry;
  if ("payload" in entry && "fetchedAt" in entry) {
    return {
      ...entry.payload,
      fetched_at: new Date(Number(entry.fetchedAt) || Date.now()).toISOString(),
    };
  }
  return null;
}

function cachePayload(cache, key, payload) {
  const entry = {
    ...payload,
    fetched_at: new Date().toISOString(),
  };
  cache[key] = entry;
  return entry;
}

function getFetchedAtMs(entry) {
  if (!entry || typeof entry !== "object") return null;
  if ("fetched_at" in entry) {
    const value = Date.parse(String(entry.fetched_at));
    return Number.isFinite(value) ? value : null;
  }
  if ("fetchedAt" in entry) {
    const value = Number(entry.fetchedAt);
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

function getPayload(entry) {
  if (!entry || typeof entry !== "object") return null;
  if ("payload" in entry && "fetchedAt" in entry) return entry.payload;
  const { fetched_at, fetchedAt, ...payload } = entry;
  return payload;
}

function isFresh(entry, ttlMs, nowMs) {
  if (!entry) return false;
  if (!(ttlMs > 0)) return false;
  const fetchedAtMs = getFetchedAtMs(entry);
  if (fetchedAtMs == null) return false;
  return nowMs - fetchedAtMs < ttlMs;
}

async function readResponseBody(response, productId) {
  if (!response?.ok) {
    const text = typeof response?.text === "function" ? await response.text() : "";
    throw new Error(`TCGplayer details failed for ${productId}: ${response?.status ?? "unknown"} ${String(text).slice(0, 200)}`);
  }

  if (typeof response?.json === "function") {
    return response.json();
  }

  if (typeof response?.text === "function") {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  throw new Error(`TCGplayer details response for ${productId} did not expose json() or text()`);
}

export async function getTcgplayerProductDetail({
  productId,
  cache,
  cachePath,
  ttlMs = DEFAULT_TTL_MS,
  fetchImpl = globalThis.fetch,
}) {
  const key = String(productId);
  const nowMs = Date.now();
  const cachedEntry = normalizeEntry(cache[key]);

  if (cachedEntry) {
    cache[key] = cachedEntry;
    if (isFresh(cachedEntry, ttlMs, nowMs)) {
      return getPayload(cachedEntry);
    }
  }

  const url = `${TCGPLAYER_DETAILS_BASE_URL}/${key}/details`;

  try {
    const response = await fetchImpl(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });
    const payload = await readResponseBody(response, key);
    cachePayload(cache, key, payload);
    if (cachePath) writeJson(cachePath, cache);
    return payload;
  } catch (error) {
    if (cachedEntry) {
      return getPayload(cachedEntry);
    }
    throw error;
  }
}
