import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

test("buildScheduledRefreshQueue prioritizes newest set cards, then demand, then delta", async () => {
  const { buildScheduledRefreshQueue } =
    await importModule<typeof import("../scripts/lib/justtcg-refresh-queue.mjs")>(
      "scripts/lib/justtcg-refresh-queue.mjs",
    );

  const queue = buildScheduledRefreshQueue({
    config: {
      newestSets: ["OP15", "EB04", "OP13"],
      perRunBudget: 10,
      hardStopBudget: 10,
      hotReserve: 2,
    },
    newestSetCards: [
      { cardPrintId: "op13-120", setCode: "OP13", number: "120" },
      { cardPrintId: "op15-010", setCode: "OP15", number: "010" },
      { cardPrintId: "eb04-002", setCode: "EB04", number: "002" },
      { cardPrintId: "op15-002", setCode: "OP15", number: "002" },
    ],
    demandCards: [
      { cardPrintId: "demand-1", setCode: "OP12", number: "001" },
      { cardPrintId: "op15-010", setCode: "OP15", number: "010" },
      { cardPrintId: "demand-2", setCode: "OP12", number: "002" },
    ],
    deltaCards: [
      { cardPrintId: "delta-1", setCode: "OP11", number: "001" },
      { cardPrintId: "demand-2", setCode: "OP12", number: "002" },
      { cardPrintId: "delta-2", setCode: "OP11", number: "002" },
    ],
  });

  assert.deepEqual(
    queue.map((entry) => entry.cardPrintId),
    ["op15-002", "op15-010", "eb04-002", "op13-120", "demand-1", "demand-2", "delta-1", "delta-2"],
  );
});

test("trimQueueToBudget enforces cap", async () => {
  const { trimQueueToBudget } =
    await importModule<typeof import("../scripts/lib/justtcg-refresh-queue.mjs")>(
      "scripts/lib/justtcg-refresh-queue.mjs",
    );

  const queue = [
    { cardPrintId: "one" },
    { cardPrintId: "two" },
    { cardPrintId: "three" },
    { cardPrintId: "four" },
  ];

  assert.deepEqual(
    trimQueueToBudget(queue, 2).map((entry) => entry.cardPrintId),
    ["one", "two"],
  );
});
