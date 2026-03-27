import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule(relativePath: string) {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href);
}

function createTempDir() {
  return mkdtempSync(path.join(os.tmpdir(), "tcgplayer-detail-cache-"));
}

function createFetchStub(responses: Array<{
  ok?: boolean;
  status?: number;
  body?: unknown;
  error?: Error;
  jsonError?: Error;
}>) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  let index = 0;

  const fetchImpl = async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const response = responses[index] || responses[responses.length - 1] || { ok: true, status: 200, body: {} };
    index += 1;

    if (response.error) throw response.error;

    const body = response.body ?? {};
    return {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: async () => {
        if (response.jsonError) throw response.jsonError;
        return body;
      },
      text: async () => JSON.stringify(body),
    } as Response;
  };

  return { calls, fetchImpl };
}

type TcgplayerCacheEntry = {
  fetched_at: string;
  [key: string]: unknown;
};

type LegacyWrappedCacheEntry = {
  payload: Record<string, unknown>;
  fetchedAt: string | number;
};

function assertWrappedLegacyCacheEntry(entry: unknown): asserts entry is LegacyWrappedCacheEntry {
  assert.ok(entry && typeof entry === "object", "expected wrapped legacy cache entry");
  assert.ok("payload" in entry, "expected wrapped legacy payload");
  assert.ok("fetchedAt" in entry, "expected wrapped legacy fetchedAt");
}

test("getTcgplayerProductDetail fetches product details from the TCGplayer details endpoint", async () => {
  const tempDir = createTempDir();
  try {
    const { getTcgplayerProductDetail } = await importModule("scripts/lib/tcgplayer-detail-cache.mjs");
    const cachePath = path.join(tempDir, "cache.json");
    const cache: Record<string, TcgplayerCacheEntry> = {};
    const { calls, fetchImpl } = createFetchStub([{ body: { id: 123, title: "Card 123" } }]);

    const detail = await getTcgplayerProductDetail({
      productId: 123,
      cache,
      cachePath,
      ttlMs: 60_000,
      fetchImpl,
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://mp-search-api.tcgplayer.com/v1/product/123/details");
    assert.deepEqual(detail, { id: 123, title: "Card 123" });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("getTcgplayerProductDetail refetches legacy raw payload cache entries immediately", async () => {
  const tempDir = createTempDir();
  try {
    const { getTcgplayerProductDetail } = await importModule("scripts/lib/tcgplayer-detail-cache.mjs");
    const cachePath = path.join(tempDir, "cache.json");
    const cache: Record<string, Record<string, unknown>> = {
      "999": {
        id: 999,
        title: "Legacy Raw",
      },
    };
    const { calls, fetchImpl } = createFetchStub([{ body: { id: 999, title: "Refetched Raw" } }]);

    const detail = await getTcgplayerProductDetail({
      productId: 999,
      cache,
      cachePath,
      ttlMs: 60_000,
      fetchImpl,
    });

    assert.equal(calls.length, 1);
    assert.deepEqual(detail, { id: 999, title: "Refetched Raw" });

    const persisted = JSON.parse(readFileSync(cachePath, "utf8"))["999"];
    assert.equal(persisted.id, 999);
    assert.equal(persisted.title, "Refetched Raw");
    assert.equal(typeof persisted.fetched_at, "string");
    assert.equal("payload" in persisted, false);
    assert.equal("fetchedAt" in persisted, false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("getTcgplayerProductDetail preserves legacy raw payload cache entries as fallback on transient refresh failure", async () => {
  const tempDir = createTempDir();
  try {
    const { getTcgplayerProductDetail } = await importModule("scripts/lib/tcgplayer-detail-cache.mjs");
    const cachePath = path.join(tempDir, "cache.json");
    const cache: Record<string, Record<string, unknown>> = {
      "997": {
        id: 997,
        title: "Legacy Raw Fallback",
      },
    };
    const { calls, fetchImpl } = createFetchStub([{ error: new Error("network down") }]);

    const detail = await getTcgplayerProductDetail({
      productId: 997,
      cache,
      cachePath,
      ttlMs: 60_000,
      fetchImpl,
    });

    assert.equal(calls.length, 1);
    assert.deepEqual(detail, { id: 997, title: "Legacy Raw Fallback" });
    assert.equal(existsSync(cachePath), false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("getTcgplayerProductDetail migrates legacy wrapped payload cache entries without refetching", async () => {
  const tempDir = createTempDir();
  try {
    const { getTcgplayerProductDetail } = await importModule("scripts/lib/tcgplayer-detail-cache.mjs");
    const cachePath = path.join(tempDir, "cache.json");
    const fetchedAt = new Date(Date.now() - 10_000).toISOString();
    const cache: Record<string, LegacyWrappedCacheEntry> = {
      "998": {
        payload: {
          id: 998,
          title: "Wrapped Legacy",
        },
        fetchedAt,
      },
    };
    const { calls, fetchImpl } = createFetchStub([{ error: new Error("should not fetch") }]);

    const detail = await getTcgplayerProductDetail({
      productId: 998,
      cache,
      cachePath,
      ttlMs: 60_000,
      fetchImpl,
    });

    assert.equal(calls.length, 0);
    assert.deepEqual(detail, { id: 998, title: "Wrapped Legacy" });

    const persisted = JSON.parse(readFileSync(cachePath, "utf8"))["998"];
    assert.equal(persisted.id, 998);
    assert.equal(persisted.title, "Wrapped Legacy");
    assert.equal(typeof persisted.fetched_at, "string");
    assert.equal("payload" in persisted, false);
    assert.equal("fetchedAt" in persisted, false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("getTcgplayerProductDetail migrates legacy wrapped payload cache entries with numeric fetchedAt values", async () => {
  const tempDir = createTempDir();
  try {
    const { getTcgplayerProductDetail } = await importModule("scripts/lib/tcgplayer-detail-cache.mjs");
    const cachePath = path.join(tempDir, "cache.json");
    const fetchedAt = Date.now() - 10_000;
    const expectedFetchedAt = new Date(fetchedAt).toISOString();
    const cache: Record<string, LegacyWrappedCacheEntry> = {
      "997": {
        payload: {
          id: 997,
          title: "Numeric Wrapped Legacy",
        },
        fetchedAt,
      },
    };
    const { calls, fetchImpl } = createFetchStub([{ error: new Error("should not fetch") }]);

    const detail = await getTcgplayerProductDetail({
      productId: 997,
      cache,
      cachePath,
      ttlMs: 60_000,
      fetchImpl,
    });

    assert.equal(calls.length, 0);
    assert.deepEqual(detail, { id: 997, title: "Numeric Wrapped Legacy" });

    const persisted = JSON.parse(readFileSync(cachePath, "utf8"))["997"];
    assert.equal(persisted.id, 997);
    assert.equal(persisted.title, "Numeric Wrapped Legacy");
    assert.equal(persisted.fetched_at, expectedFetchedAt);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("getTcgplayerProductDetail treats malformed wrapped fetchedAt values as stale and refetches immediately", async () => {
  const tempDir = createTempDir();
  try {
    const { getTcgplayerProductDetail } = await importModule("scripts/lib/tcgplayer-detail-cache.mjs");
    const cachePath = path.join(tempDir, "cache.json");
    const cache: Record<string, LegacyWrappedCacheEntry> = {
      "996": {
        payload: {
          id: 996,
          title: "Malformed Wrapped",
        },
        fetchedAt: "not-a-date",
      },
    };
    const { calls, fetchImpl } = createFetchStub([{ body: { id: 996, title: "Refetched Wrapped" } }]);

    const detail = await getTcgplayerProductDetail({
      productId: 996,
      cache,
      cachePath,
      ttlMs: 60_000,
      fetchImpl,
    });

    assert.equal(calls.length, 1);
    assert.deepEqual(detail, { id: 996, title: "Refetched Wrapped" });
    const persisted = JSON.parse(readFileSync(cachePath, "utf8"))["996"];
    assert.equal(persisted.id, 996);
    assert.equal(persisted.title, "Refetched Wrapped");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("getTcgplayerProductDetail merges new writes with existing on-disk cache entries", async () => {
  const tempDir = createTempDir();
  try {
    const { getTcgplayerProductDetail } = await importModule("scripts/lib/tcgplayer-detail-cache.mjs");
    const cachePath = path.join(tempDir, "cache.json");
    const existing = {
      "111": {
        id: 111,
        title: "Existing Entry",
        fetched_at: new Date(Date.now() - 10_000).toISOString(),
      },
    };
    writeFileSync(cachePath, `${JSON.stringify(existing, null, 2)}\n`);
    const cache: Record<string, TcgplayerCacheEntry> = {};
    const { calls, fetchImpl } = createFetchStub([{ body: { id: 222, title: "Merged Entry" } }]);

    const detail = await getTcgplayerProductDetail({
      productId: 222,
      cache,
      cachePath,
      ttlMs: 60_000,
      fetchImpl,
    });

    assert.equal(calls.length, 1);
    assert.deepEqual(detail, { id: 222, title: "Merged Entry" });
    const persisted = JSON.parse(readFileSync(cachePath, "utf8"));
    assert.equal(persisted["111"].title, "Existing Entry");
    assert.equal(persisted["222"].title, "Merged Entry");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("getTcgplayerProductDetail keeps the fresher on-disk entry for the same product key", async () => {
  const tempDir = createTempDir();
  try {
    const { getTcgplayerProductDetail } = await importModule("scripts/lib/tcgplayer-detail-cache.mjs");
    const cachePath = path.join(tempDir, "cache.json");
    const onDiskFetchedAt = new Date(Date.now() - 1_000).toISOString();
    const memoryFetchedAt = new Date(Date.now() - 60_000).toISOString();
    writeFileSync(cachePath, `${JSON.stringify({
      "111": {
        id: 111,
        title: "Fresher Disk",
        fetched_at: onDiskFetchedAt,
      },
    }, null, 2)}\n`);
    const cache: Record<string, TcgplayerCacheEntry> = {
      "111": {
        id: 111,
        title: "Staler Memory",
        fetched_at: memoryFetchedAt,
      } as TcgplayerCacheEntry,
    };
    const { calls, fetchImpl } = createFetchStub([{ body: { id: 222, title: "Another Entry" } }]);

    await getTcgplayerProductDetail({
      productId: 222,
      cache,
      cachePath,
      ttlMs: 60_000,
      fetchImpl,
    });

    assert.equal(calls.length, 1);
    const persisted = JSON.parse(readFileSync(cachePath, "utf8"));
    assert.equal(persisted["111"].title, "Fresher Disk");
    assert.equal(persisted["222"].title, "Another Entry");
    assert.equal(cache["111"].title, "Fresher Disk");
    assert.equal(cache["111"].fetched_at, onDiskFetchedAt);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("getTcgplayerProductDetail prefers fresher wrapped on-disk entries for the same product key", async () => {
  const tempDir = createTempDir();
  try {
    const { getTcgplayerProductDetail } = await importModule("scripts/lib/tcgplayer-detail-cache.mjs");
    const cachePath = path.join(tempDir, "cache.json");
    const onDiskFetchedAt = new Date(Date.now() - 1_000).toISOString();
    const memoryFetchedAt = new Date(Date.now() - 60_000).toISOString();
    writeFileSync(cachePath, `${JSON.stringify({
      "111": {
        payload: {
          id: 111,
          title: "Wrapped Fresher Disk",
        },
        fetchedAt: onDiskFetchedAt,
      },
    }, null, 2)}\n`);
    const cache: Record<string, TcgplayerCacheEntry> = {
      "111": {
        id: 111,
        title: "Staler Memory",
        fetched_at: memoryFetchedAt,
      } as TcgplayerCacheEntry,
    };
    const { calls, fetchImpl } = createFetchStub([{ body: { id: 222, title: "Another Entry" } }]);

    await getTcgplayerProductDetail({
      productId: 222,
      cache,
      cachePath,
      ttlMs: 60_000,
      fetchImpl,
    });

    assert.equal(calls.length, 1);
    const persisted = JSON.parse(readFileSync(cachePath, "utf8"));
    assert.equal(persisted["111"].payload.title, "Wrapped Fresher Disk");
    assert.equal(persisted["111"].fetchedAt, onDiskFetchedAt);
    assert.equal(persisted["222"].title, "Another Entry");
    assertWrappedLegacyCacheEntry(cache["111"]);
    assert.equal(cache["111"].payload.title, "Wrapped Fresher Disk");
    assert.equal(cache["111"].fetchedAt, onDiskFetchedAt);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("getTcgplayerProductDetail prefers fresher on-disk data on same-key reads", async () => {
  const tempDir = createTempDir();
  try {
    const { getTcgplayerProductDetail } = await importModule("scripts/lib/tcgplayer-detail-cache.mjs");
    const cachePath = path.join(tempDir, "cache.json");
    const onDiskFetchedAt = new Date(Date.now() - 1_000).toISOString();
    const memoryFetchedAt = new Date(Date.now() - 60_000).toISOString();
    writeFileSync(cachePath, `${JSON.stringify({
      "111": {
        id: 111,
        title: "Fresher Disk",
        fetched_at: onDiskFetchedAt,
      },
    }, null, 2)}\n`);
    const cache: Record<string, TcgplayerCacheEntry> = {
      "111": {
        id: 111,
        title: "Staler Memory",
        fetched_at: memoryFetchedAt,
      } as TcgplayerCacheEntry,
    };
    const { calls, fetchImpl } = createFetchStub([{ error: new Error("should not fetch") }]);

    const detail = await getTcgplayerProductDetail({
      productId: 111,
      cache,
      cachePath,
      ttlMs: 60_000,
      fetchImpl,
    });

    assert.equal(calls.length, 0);
    assert.deepEqual(detail, { id: 111, title: "Fresher Disk" });
    assert.equal(cache["111"].title, "Fresher Disk");
    assert.equal(cache["111"].fetched_at, onDiskFetchedAt);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("getTcgplayerProductDetail heals malformed on-disk cache files during writes", async () => {
  const tempDir = createTempDir();
  try {
    const { getTcgplayerProductDetail } = await importModule("scripts/lib/tcgplayer-detail-cache.mjs");
    const cachePath = path.join(tempDir, "cache.json");
    const malformed = "{\n  \"111\": {\n    \"id\": 111,\n    \"title\": \"Partial Entry\"\n";
    writeFileSync(cachePath, malformed);
    const cache: Record<string, TcgplayerCacheEntry> = {};
    const { calls, fetchImpl } = createFetchStub([{ body: { id: 222, title: "Fresh Entry" } }]);

    const detail = await getTcgplayerProductDetail({
      productId: 222,
      cache,
      cachePath,
      ttlMs: 60_000,
      fetchImpl,
    });

    assert.equal(calls.length, 1);
    assert.deepEqual(detail, { id: 222, title: "Fresh Entry" });
    const healed = JSON.parse(readFileSync(cachePath, "utf8"));
    assert.equal(healed["222"].id, 222);
    assert.equal(healed["222"].title, "Fresh Entry");
    assert.equal(typeof healed["222"].fetched_at, "string");
    assert.equal(cache["222"].title, "Fresh Entry");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("getTcgplayerProductDetail heals malformed on-disk cache files after a successful fetch", async () => {
  const tempDir = createTempDir();
  try {
    const { getTcgplayerProductDetail } = await importModule("scripts/lib/tcgplayer-detail-cache.mjs");
    const cachePath = path.join(tempDir, "cache.json");
    writeFileSync(cachePath, "{\n  \"111\": {\n    \"id\": 111,\n    \"title\": \"Partial Entry\"\n");

    const firstCache: Record<string, TcgplayerCacheEntry> = {};
    const { calls, fetchImpl } = createFetchStub([{ body: { id: 222, title: "Fresh Entry" } }]);

    const detail = await getTcgplayerProductDetail({
      productId: 222,
      cache: firstCache,
      cachePath,
      ttlMs: 60_000,
      fetchImpl,
    });

    assert.equal(calls.length, 1);
    assert.deepEqual(detail, { id: 222, title: "Fresh Entry" });

    const healed = JSON.parse(readFileSync(cachePath, "utf8"));
    assert.deepEqual(healed["222"], {
      id: 222,
      title: "Fresh Entry",
      fetched_at: healed["222"].fetched_at,
    });
    assert.equal(typeof healed["222"].fetched_at, "string");

    const secondCache: Record<string, TcgplayerCacheEntry> = {};
    const followUp = await getTcgplayerProductDetail({
      productId: 222,
      cache: secondCache,
      cachePath,
      ttlMs: 60_000,
      fetchImpl,
    });

    assert.equal(calls.length, 1);
    assert.deepEqual(followUp, { id: 222, title: "Fresh Entry" });
    assert.equal(secondCache["222"].title, "Fresh Entry");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("getTcgplayerProductDetail reuses a cached response on the second fetch", async () => {
  const tempDir = createTempDir();
  try {
    const { getTcgplayerProductDetail } = await importModule("scripts/lib/tcgplayer-detail-cache.mjs");
    const cachePath = path.join(tempDir, "cache.json");
    const cache: Record<string, TcgplayerCacheEntry> = {};
    const { calls, fetchImpl } = createFetchStub([{ body: { id: 456, title: "Cached Card" } }]);

    const first = await getTcgplayerProductDetail({
      productId: 456,
      cache,
      cachePath,
      ttlMs: 60_000,
      fetchImpl,
    });
    const second = await getTcgplayerProductDetail({
      productId: 456,
      cache,
      cachePath,
      ttlMs: 60_000,
      fetchImpl,
    });

    assert.equal(calls.length, 1);
    assert.deepEqual(first, { id: 456, title: "Cached Card" });
    assert.deepEqual(second, { id: 456, title: "Cached Card" });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("getTcgplayerProductDetail refreshes stale cache entries after the TTL expires", async () => {
  const tempDir = createTempDir();
  try {
    const { getTcgplayerProductDetail } = await importModule("scripts/lib/tcgplayer-detail-cache.mjs");
    const cachePath = path.join(tempDir, "cache.json");
    const cache: Record<string, TcgplayerCacheEntry> = {};
    const { calls, fetchImpl } = createFetchStub([
      { body: { id: 789, title: "Old Card" } },
      { body: { id: 789, title: "Fresh Card" } },
    ]);

    await getTcgplayerProductDetail({
      productId: 789,
      cache,
      cachePath,
      ttlMs: 1,
      fetchImpl,
    });

    const staleFetchedAt = new Date(Date.now() - 60_000).toISOString();
    cache["789"].fetched_at = staleFetchedAt;
    const persisted = JSON.parse(readFileSync(cachePath, "utf8"));
    persisted["789"].fetched_at = staleFetchedAt;
    writeFileSync(cachePath, `${JSON.stringify(persisted, null, 2)}\n`);

    const refreshed = await getTcgplayerProductDetail({
      productId: 789,
      cache,
      cachePath,
      ttlMs: 1,
      fetchImpl,
    });

    assert.equal(calls.length, 2);
    assert.deepEqual(refreshed, { id: 789, title: "Fresh Card" });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("getTcgplayerProductDetail refreshes stale wrapped legacy cache entries after the TTL expires", async () => {
  const tempDir = createTempDir();
  try {
    const { getTcgplayerProductDetail } = await importModule("scripts/lib/tcgplayer-detail-cache.mjs");
    const cachePath = path.join(tempDir, "cache.json");
    const staleFetchedAt = new Date(Date.now() - 60_000).toISOString();
    const cache: Record<string, LegacyWrappedCacheEntry> = {
      "788": {
        payload: {
          id: 788,
          title: "Stale Wrapped Legacy",
        },
        fetchedAt: staleFetchedAt,
      },
    };
    const { calls, fetchImpl } = createFetchStub([{ body: { id: 788, title: "Fresh Wrapped" } }]);

    const refreshed = await getTcgplayerProductDetail({
      productId: 788,
      cache,
      cachePath,
      ttlMs: 1,
      fetchImpl,
    });

    assert.equal(calls.length, 1);
    assert.deepEqual(refreshed, { id: 788, title: "Fresh Wrapped" });
    const persisted = JSON.parse(readFileSync(cachePath, "utf8"))["788"];
    assert.equal(persisted.id, 788);
    assert.equal(persisted.title, "Fresh Wrapped");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("getTcgplayerProductDetail preserves the last good payload when a refresh fails", async () => {
  const tempDir = createTempDir();
  try {
    const { getTcgplayerProductDetail } = await importModule("scripts/lib/tcgplayer-detail-cache.mjs");
    const cachePath = path.join(tempDir, "cache.json");
    const cache: Record<string, TcgplayerCacheEntry> = {};
    const { calls, fetchImpl } = createFetchStub([
      { body: { id: 321, title: "Stable Card" } },
      { error: new Error("network down") },
    ]);

    await getTcgplayerProductDetail({
      productId: 321,
      cache,
      cachePath,
      ttlMs: 1,
      fetchImpl,
    });

    const staleFetchedAt = new Date(Date.now() - 60_000).toISOString();
    cache["321"].fetched_at = staleFetchedAt;
    const persisted = JSON.parse(readFileSync(cachePath, "utf8"));
    persisted["321"].fetched_at = staleFetchedAt;
    writeFileSync(cachePath, `${JSON.stringify(persisted, null, 2)}\n`);

    const fallback = await getTcgplayerProductDetail({
      productId: 321,
      cache,
      cachePath,
      ttlMs: 1,
      fetchImpl,
    });

    assert.equal(calls.length, 2);
    assert.deepEqual(fallback, { id: 321, title: "Stable Card" });
    const persistedFallback = JSON.parse(readFileSync(cachePath, "utf8"))["321"];
    assert.equal(persistedFallback.id, 321);
    assert.equal(persistedFallback.title, "Stable Card");
    assert.equal(typeof persistedFallback.fetched_at, "string");
    assert.equal("payload" in persistedFallback, false);
    assert.equal("fetchedAt" in persistedFallback, false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("getTcgplayerProductDetail preserves the last good payload when a refresh returns malformed JSON", async () => {
  const tempDir = createTempDir();
  try {
    const { getTcgplayerProductDetail } = await importModule("scripts/lib/tcgplayer-detail-cache.mjs");
    const cachePath = path.join(tempDir, "cache.json");
    const cache: Record<string, TcgplayerCacheEntry> = {};
    const { calls, fetchImpl } = createFetchStub([
      { body: { id: 322, title: "Stable Card" } },
      { jsonError: new SyntaxError("Unexpected end of JSON input") },
    ]);

    await getTcgplayerProductDetail({
      productId: 322,
      cache,
      cachePath,
      ttlMs: 1,
      fetchImpl,
    });

    const staleFetchedAt = new Date(Date.now() - 60_000).toISOString();
    cache["322"].fetched_at = staleFetchedAt;
    const persisted = JSON.parse(readFileSync(cachePath, "utf8"));
    persisted["322"].fetched_at = staleFetchedAt;
    writeFileSync(cachePath, `${JSON.stringify(persisted, null, 2)}\n`);

    const fallback = await getTcgplayerProductDetail({
      productId: 322,
      cache,
      cachePath,
      ttlMs: 1,
      fetchImpl,
    });

    assert.equal(calls.length, 2);
    assert.deepEqual(fallback, { id: 322, title: "Stable Card" });
    const persistedMalformed = JSON.parse(readFileSync(cachePath, "utf8"))["322"];
    assert.equal(persistedMalformed.id, 322);
    assert.equal(persistedMalformed.title, "Stable Card");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("getTcgplayerProductDetail does not fall back to stale cache on permanent failures", async () => {
  const tempDir = createTempDir();
  try {
    const { getTcgplayerProductDetail } = await importModule("scripts/lib/tcgplayer-detail-cache.mjs");
    const cachePath = path.join(tempDir, "cache.json");
    const cache: Record<string, TcgplayerCacheEntry> = {};
    const { calls, fetchImpl } = createFetchStub([
      { body: { id: 404, title: "Stale Card" } },
      { ok: false, status: 404, body: { error: "not found" } },
    ]);

    await getTcgplayerProductDetail({
      productId: 404,
      cache,
      cachePath,
      ttlMs: 1,
      fetchImpl,
    });

    const staleFetchedAt = new Date(Date.now() - 60_000).toISOString();
    cache["404"].fetched_at = staleFetchedAt;
    const persisted = JSON.parse(readFileSync(cachePath, "utf8"));
    persisted["404"].fetched_at = staleFetchedAt;
    writeFileSync(cachePath, `${JSON.stringify(persisted, null, 2)}\n`);

    await assert.rejects(
      getTcgplayerProductDetail({
        productId: 404,
        cache,
        cachePath,
        ttlMs: 1,
        fetchImpl,
      }),
      /404/,
    );

    assert.equal(calls.length, 2);
    const persistedFailure = JSON.parse(readFileSync(cachePath, "utf8"))["404"];
    assert.equal(persistedFailure.id, 404);
    assert.equal(persistedFailure.title, "Stale Card");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
