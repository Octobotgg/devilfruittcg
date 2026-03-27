import { writeJson } from "./justtcg-utils.mjs";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const TCGPLAYER_DETAILS_BASE_URL = "https://mp-search-api.tcgplayer.com/v1/product";

function normalizeEntry(entry, nowMs) {
  if (entry && typeof entry === "object" && "payload" in entry && "fetchedAt" in entry) {
    return entry;
  }
  if (entry == null) return null;
  return { payload: entry, fetchedAt: nowMs };
}

function cachePayload(cache, key, payload) {
  const entry = {
    payload,
    fetchedAt: Date.now(),
  };
  cache[key] = entry;
  return entry;
}

function isFresh(entry, ttlMs, nowMs) {
  if (!entry) return false;
  if (!(ttlMs > 0)) return false;
  return nowMs - entry.fetchedAt < ttlMs;
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
  const cachedEntry = normalizeEntry(cache[key], nowMs);

  if (cachedEntry) {
    cache[key] = cachedEntry;
    if (isFresh(cachedEntry, ttlMs, nowMs)) {
      return cachedEntry.payload;
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
      return cachedEntry.payload;
    }
    throw error;
  }
}
