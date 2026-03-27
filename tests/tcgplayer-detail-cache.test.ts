import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
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

test("getTcgplayerProductDetail migrates legacy raw payload cache entries without refetching", async () => {
  const tempDir = createTempDir();
  try {
    const { getTcgplayerProductDetail } = await importModule("scripts/lib/tcgplayer-detail-cache.mjs");
    const cachePath = path.join(tempDir, "cache.json");
    const cache: Record<string, TcgplayerCacheEntry> = {
      "999": {
        id: 999,
        title: "Legacy Raw",
      } as TcgplayerCacheEntry,
    };
    const { calls, fetchImpl } = createFetchStub([{ error: new Error("should not fetch") }]);

    const detail = await getTcgplayerProductDetail({
      productId: 999,
      cache,
      cachePath,
      ttlMs: 60_000,
      fetchImpl,
    });

    assert.equal(calls.length, 0);
    assert.deepEqual(detail, { id: 999, title: "Legacy Raw" });

    const persisted = JSON.parse(readFileSync(cachePath, "utf8"))["999"];
    assert.equal(persisted.id, 999);
    assert.equal(persisted.title, "Legacy Raw");
    assert.equal(typeof persisted.fetched_at, "string");
    assert.equal("payload" in persisted, false);
    assert.equal("fetchedAt" in persisted, false);
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
    const cache: Record<string, TcgplayerCacheEntry> = {
      "998": {
        payload: {
          id: 998,
          title: "Wrapped Legacy",
        },
        fetchedAt,
      } as unknown as TcgplayerCacheEntry,
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

    cache["789"].fetched_at = new Date(Date.now() - 60_000).toISOString();

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

    cache["321"].fetched_at = new Date(Date.now() - 60_000).toISOString();

    const fallback = await getTcgplayerProductDetail({
      productId: 321,
      cache,
      cachePath,
      ttlMs: 1,
      fetchImpl,
    });

    assert.equal(calls.length, 2);
    assert.deepEqual(fallback, { id: 321, title: "Stable Card" });
    const persisted = JSON.parse(readFileSync(cachePath, "utf8"))["321"];
    assert.equal(persisted.id, 321);
    assert.equal(persisted.title, "Stable Card");
    assert.equal(typeof persisted.fetched_at, "string");
    assert.equal("payload" in persisted, false);
    assert.equal("fetchedAt" in persisted, false);
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

    cache["322"].fetched_at = new Date(Date.now() - 60_000).toISOString();

    const fallback = await getTcgplayerProductDetail({
      productId: 322,
      cache,
      cachePath,
      ttlMs: 1,
      fetchImpl,
    });

    assert.equal(calls.length, 2);
    assert.deepEqual(fallback, { id: 322, title: "Stable Card" });
    const persisted = JSON.parse(readFileSync(cachePath, "utf8"))["322"];
    assert.equal(persisted.id, 322);
    assert.equal(persisted.title, "Stable Card");
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

    cache["404"].fetched_at = new Date(Date.now() - 60_000).toISOString();

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
    const persisted = JSON.parse(readFileSync(cachePath, "utf8"))["404"];
    assert.equal(persisted.id, 404);
    assert.equal(persisted.title, "Stale Card");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
