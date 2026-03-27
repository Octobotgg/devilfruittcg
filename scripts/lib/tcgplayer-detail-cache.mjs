import fs from "fs";
import { writeJson } from "./justtcg-utils.mjs";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const TCGPLAYER_DETAILS_BASE_URL = "https://mp-search-api.tcgplayer.com/v1/product";
const RETRIABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504, 520, 522, 524]);
const LEGACY_RAW_FRESH_AT = new Date(0).toISOString();

class TransientTcgplayerDetailError extends Error {
  constructor(message) {
    super(message);
    this.name = "TransientTcgplayerDetailError";
  }
}

class PermanentTcgplayerDetailError extends Error {
  constructor(message) {
    super(message);
    this.name = "PermanentTcgplayerDetailError";
  }
}

function normalizeFetchedAt(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      const numeric = Number(trimmed);
      if (Number.isFinite(numeric)) {
        return new Date(numeric < 1e12 ? numeric * 1000 : numeric).toISOString();
      }
    }
    const parsed = Date.parse(trimmed);
    if (Number.isFinite(parsed)) {
      return trimmed;
    }
    return trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value < 1e12 ? value * 1000 : value).toISOString();
  }
  return String(value ?? "");
}

function parseFetchedAtMs(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      const numeric = Number(trimmed);
      return Number.isFinite(numeric) ? (numeric < 1e12 ? numeric * 1000 : numeric) : null;
    }
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeEntry(entry) {
  if (!entry || typeof entry !== "object") return { entry: null, migrated: false, persistOnRead: false };
  if ("fetched_at" in entry) return { entry, migrated: false, persistOnRead: false };
  if ("payload" in entry && "fetchedAt" in entry) {
    return {
      entry: {
        ...entry.payload,
        fetched_at: normalizeFetchedAt(entry.fetchedAt),
      },
      migrated: true,
      persistOnRead: true,
    };
  }
  return {
    entry: {
      ...entry,
      fetched_at: LEGACY_RAW_FRESH_AT,
    },
    migrated: true,
    persistOnRead: false,
  };
}

function cachePayload(cache, key, payload) {
  const entry = { ...payload, fetched_at: new Date().toISOString() };
  cache[key] = entry;
  return entry;
}

function loadCacheFileState(cachePath) {
  if (!cachePath) return { entries: {}, exists: false, readable: true };
  try {
    const text = fs.readFileSync(cachePath, "utf8");
    const parsed = JSON.parse(text);
    return {
      entries: parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {},
      exists: true,
      readable: true,
    };
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return { entries: {}, exists: false, readable: true };
    }
    return { entries: null, exists: true, readable: false };
  }
}

function entryFreshnessMs(entry) {
  return getFetchedAtMs(entry);
}

function preferCacheEntry(existing, incoming) {
  if (!existing) return incoming;
  if (!incoming) return existing;
  const existingMs = entryFreshnessMs(existing);
  const incomingMs = entryFreshnessMs(incoming);
  if (existingMs == null && incomingMs == null) return incoming;
  if (existingMs == null) return incoming;
  if (incomingMs == null) return existing;
  return incomingMs >= existingMs ? incoming : existing;
}

function mergeCacheContents(onDisk, cache) {
  const merged = { ...onDisk };
  for (const [key, incoming] of Object.entries(cache)) {
    merged[key] = preferCacheEntry(onDisk[key], incoming);
  }
  return merged;
}

function syncCacheObject(cache, merged) {
  for (const key of Object.keys(cache)) {
    if (!(key in merged)) delete cache[key];
  }
  for (const [key, value] of Object.entries(merged)) {
    cache[key] = value;
  }
}

function writeMergedCache(cachePath, cache) {
  if (!cachePath) return null;
  const state = loadCacheFileState(cachePath);
  if (!state.readable) return null;
  const merged = mergeCacheContents(state.entries, cache);
  writeJson(cachePath, merged);
  syncCacheObject(cache, merged);
  return merged;
}

function getCachedEntryForRead(cachePath, cache, key) {
  const memoryState = normalizeEntry(cache[key]);
  const cacheFileState = loadCacheFileState(cachePath);
  const onDiskState = cacheFileState.readable ? normalizeEntry(cacheFileState.entries[key]) : { entry: null, migrated: false, persistOnRead: false };
  const preferred = preferCacheEntry(memoryState.entry, onDiskState.entry);

  if (preferred) {
    cache[key] = preferred;
  }

  return {
    entry: preferred,
    persistOnRead: Boolean(memoryState.persistOnRead || onDiskState.persistOnRead),
  };
}

function getFetchedAtMs(entry) {
  if (!entry || typeof entry !== "object") return null;
  if ("fetched_at" in entry) {
    return parseFetchedAtMs(entry.fetched_at);
  }
  if ("fetchedAt" in entry) {
    return parseFetchedAtMs(entry.fetchedAt);
  }
  return null;
}

function getPayload(entry) {
  if (!entry || typeof entry !== "object") return null;
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
    const status = Number(response?.status ?? NaN);
    const message = `TCGplayer details failed for ${productId}: ${response?.status ?? "unknown"} ${String(text).slice(0, 200)}`;
    if (RETRIABLE_STATUSES.has(status)) {
      throw new TransientTcgplayerDetailError(message);
    }
    throw new PermanentTcgplayerDetailError(message);
  }

  try {
    if (typeof response?.json === "function") {
      return await response.json();
    }

    if (typeof response?.text === "function") {
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new TransientTcgplayerDetailError(`TCGplayer details for ${productId} returned invalid JSON: ${message}`);
  }

  throw new Error(`TCGplayer details response for ${productId} did not expose json() or text()`);
}

function isTransientFetchFailure(error) {
  if (error instanceof TransientTcgplayerDetailError) return true;
  if (error instanceof PermanentTcgplayerDetailError) return false;
  if (error instanceof TypeError) return true;
  const message = error instanceof Error ? error.message : String(error);
  return /fetch failed|network|timeout|aborted/i.test(message);
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
  const { entry: cachedEntry, persistOnRead } = getCachedEntryForRead(cachePath, cache, key);

  if (cachedEntry) {
    if (persistOnRead && cachePath) {
      writeMergedCache(cachePath, cache);
    }
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
    if (cachePath) writeMergedCache(cachePath, cache);
    return payload;
  } catch (error) {
    if (cachedEntry && isTransientFetchFailure(error)) {
      return getPayload(cachedEntry);
    }
    throw error;
  }
}
