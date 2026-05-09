import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

test("fetchPage aborts a hanging JustTCG catalog request and retries", async () => {
  const { fetchPage } =
    await importModule<typeof import("../scripts/fetch-justtcg-catalog.mjs")>(
      "scripts/fetch-justtcg-catalog.mjs",
    );

  let callCount = 0;
  const fetchImpl = async (_url: string | URL, init?: RequestInit) => {
    callCount += 1;
    if (callCount === 1) {
      return await new Promise((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      });
    }

    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => JSON.stringify({ data: [{ id: "justtcg:zoro" }], meta: { total: 1 } }),
    } as Response;
  };

  const page = await fetchPage({
    apiKey: "test-key",
    game: "one-piece-card-game",
    limit: 100,
    offset: 0,
    fetchImpl,
    requestTimeoutMs: 5,
    retryBaseMs: 1,
    sleepImpl: async () => {},
  });

  assert.equal(callCount, 2);
  assert.deepEqual(page, {
    cards: [{ id: "justtcg:zoro" }],
    meta: { total: 1 },
  });
});
