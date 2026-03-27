import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule(relativePath: string) {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href);
}

test("evaluateVerificationCard keeps approval and unresolved reporting mutually exclusive", async () => {
  const { evaluateVerificationCard } = await importModule("scripts/verify-missing-justtcg-set.mjs");

  const card = {
    id: "card-1",
    name: "Monkey D. Luffy",
    printedCardId: "OP01-001",
    set: "Romance Dawn [OP01]",
    releaseCode: "OP01",
    variantType: "parallel",
    variantLabel: "Parallel",
  };

  const candidate = {
    id: "candidate-1",
    name: "Monkey D. Luffy Parallel OP01-001",
    number: "OP01-001",
    set_name: "Romance Dawn",
    variants: [{ condition: "near mint", price: 12.5 }],
    tcgplayerId: "123",
  };

  const result = evaluateVerificationCard({
    card,
    expectedNumber: "OP01-001",
    releaseCode: "OP01",
    candidateResults: [
      {
        candidate,
        tcgplayerId: "123",
        detail: {
          productName: "Monkey D. Luffy Parallel OP01-001",
          productUrlName: "monkey-d-luffy-parallel-op01-001",
          setName: "Romance Dawn",
          productLineName: "One Piece Card Game",
          customAttributes: { number: "OP01-001" },
          formattedAttributes: { Number: "OP01-001" },
        },
      },
      {
        candidate: {
          id: "candidate-2",
          name: "Monkey D. Luffy OP01-001",
          number: "OP01-001",
          set_name: "Romance Dawn",
          tcgplayerId: "456",
        },
        tcgplayerId: "456",
        error: new Error("TCGplayer details failed for 456: 404 not found"),
      },
    ],
    ebayPrice: null,
    allowLabelCorrections: false,
  });

  assert.equal(result.approved.length, 1);
  assert.equal(result.unresolved.length, 0);
});

test("evaluateVerificationCard emits one unresolved card for candidate-level failures", async () => {
  const { evaluateVerificationCard } = await importModule("scripts/verify-missing-justtcg-set.mjs");

  const card = {
    id: "card-2",
    name: "Monkey D. Luffy",
    printedCardId: "OP01-002",
    set: "Romance Dawn [OP01]",
    releaseCode: "OP01",
  };

  const result = evaluateVerificationCard({
    card,
    expectedNumber: "OP01-002",
    releaseCode: "OP01",
    candidateResults: [
      {
        candidate: {
          id: "candidate-3",
          name: "Monkey D. Luffy OP01-002",
          number: "OP01-002",
          set_name: "Romance Dawn",
          tcgplayerId: "789",
        },
        tcgplayerId: "789",
        error: new Error("TCGplayer details failed for 789: 404 not found"),
      },
      {
        candidate: {
          id: "candidate-4",
          name: "Monkey D. Luffy OP01-002",
          number: "OP01-002",
          set_name: "Romance Dawn",
          tcgplayerId: "790",
        },
        tcgplayerId: "790",
        error: new Error("TCGplayer details failed for 790: 503 service unavailable"),
      },
    ],
    ebayPrice: null,
    allowLabelCorrections: false,
  });

  assert.equal(result.approved.length, 0);
  assert.equal(result.unresolved.length, 1);
  assert.equal(result.unresolved[0].cardId, "card-2");
  assert.equal(result.unresolved[0].candidateFailures.length, 2);
});
