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

test("verify-missing-justtcg-set defaults resolve against the current worktree", async () => {
  const module = await importModule("scripts/verify-missing-justtcg-set.mjs");

  assert.equal(module.REPO_ROOT, REPO_ROOT);
  assert.equal(module.DEFAULT_DB_PATH, path.join(REPO_ROOT, ".cache", "devilfruit.db"));
  assert.equal(module.DEFAULT_TCGPLAYER_CACHE_PATH, path.join(REPO_ROOT, ".cache", "justtcg", "tcgplayer-details-cache.json"));
  assert.equal(module.DEFAULT_REPORT_PATH, path.join(REPO_ROOT, ".cache", "justtcg", "set-verification-report.json"));
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

test("evaluateVerificationCard rejects cards that fail the price guard", async () => {
  const { evaluateVerificationCard } = await importModule("scripts/verify-missing-justtcg-set.mjs");

  const card = {
    id: "card-3",
    name: "Monkey D. Luffy",
    printedCardId: "OP01-003",
    set: "Romance Dawn [OP01]",
    releaseCode: "OP01",
    variantType: "parallel",
    variantLabel: "Parallel",
  };

  const result = evaluateVerificationCard({
    card,
    expectedNumber: "OP01-003",
    releaseCode: "OP01",
    candidateResults: [
      {
        candidate: {
          id: "candidate-5",
          name: "Monkey D. Luffy Parallel OP01-003",
          number: "OP01-003",
          set_name: "Romance Dawn",
          variants: [{ condition: "near mint", price: 100 }],
          tcgplayerId: "123",
        },
        tcgplayerId: "123",
        detail: {
          productName: "Monkey D. Luffy Parallel OP01-003",
          productUrlName: "monkey-d-luffy-parallel-op01-003",
          setName: "Romance Dawn",
          productLineName: "One Piece Card Game",
          customAttributes: { number: "OP01-003" },
          formattedAttributes: { Number: "OP01-003" },
        },
      },
    ],
    ebayPrice: 10,
    allowLabelCorrections: false,
  });

  assert.equal(result.approved.length, 0);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.rejected[0].reason, "price_guard_rejected");
});

test("evaluateVerificationCard approves label corrections when identity matches but the label needs normalization", async () => {
  const { evaluateVerificationCard } = await importModule("scripts/verify-missing-justtcg-set.mjs");

  const card = {
    id: "card-4",
    name: "Monkey D. Luffy",
    printedCardId: "OP01-004",
    set: "Romance Dawn [OP01]",
    releaseCode: "OP01",
  };

  const result = evaluateVerificationCard({
    card,
    expectedNumber: "OP01-004",
    releaseCode: "OP01",
    candidateResults: [
      {
        candidate: {
          id: "candidate-6",
          name: "Monkey D. Luffy Pirate Foil OP01-004",
          number: "OP01-004",
          set_name: "Romance Dawn",
          variants: [{ condition: "near mint", price: 15 }],
          tcgplayerId: "124",
        },
        tcgplayerId: "124",
        detail: {
          productName: "Monkey D. Luffy Pirate Foil OP01-004",
          productUrlName: "monkey-d-luffy-pirate-foil-op01-004",
          setName: "Romance Dawn",
          productLineName: "One Piece Card Game",
          customAttributes: { number: "OP01-004" },
          formattedAttributes: { Number: "OP01-004" },
        },
      },
    ],
    ebayPrice: null,
    allowLabelCorrections: true,
  });

  assert.equal(result.approved.length, 1);
  assert.equal(result.labelCorrections.length, 1);
  assert.equal(result.unresolved.length, 0);
  assert.equal(result.labelCorrections[0].suggestedVariantLabel, "Pirate Foil");
});

test("evaluateVerificationCard marks ambiguous multi-candidate results as unresolved", async () => {
  const { evaluateVerificationCard } = await importModule("scripts/verify-missing-justtcg-set.mjs");

  const card = {
    id: "card-5",
    name: "Monkey D. Luffy",
    printedCardId: "OP01-005",
    set: "Romance Dawn [OP01]",
    releaseCode: "OP01",
    variantType: "parallel",
    variantLabel: "Parallel",
  };

  const candidateResults = [
    {
      candidate: {
        id: "candidate-7",
        name: "Monkey D. Luffy Parallel OP01-005",
        number: "OP01-005",
        set_name: "Romance Dawn",
        variants: [{ condition: "near mint", price: 11 }],
        tcgplayerId: "125",
      },
      tcgplayerId: "125",
      detail: {
        productName: "Monkey D. Luffy Parallel OP01-005",
        productUrlName: "monkey-d-luffy-parallel-op01-005",
        setName: "Romance Dawn",
        productLineName: "One Piece Card Game",
        customAttributes: { number: "OP01-005" },
        formattedAttributes: { Number: "OP01-005" },
      },
    },
    {
      candidate: {
        id: "candidate-8",
        name: "Monkey D. Luffy Parallel OP01-005 Alt",
        number: "OP01-005",
        set_name: "Romance Dawn",
        variants: [{ condition: "near mint", price: 11 }],
        tcgplayerId: "126",
      },
      tcgplayerId: "126",
      detail: {
        productName: "Monkey D. Luffy Parallel OP01-005 Alt",
        productUrlName: "monkey-d-luffy-parallel-op01-005-alt",
        setName: "Romance Dawn",
        productLineName: "One Piece Card Game",
        customAttributes: { number: "OP01-005" },
        formattedAttributes: { Number: "OP01-005" },
      },
    },
  ];

  const result = evaluateVerificationCard({
    card,
    expectedNumber: "OP01-005",
    releaseCode: "OP01",
    candidateResults,
    ebayPrice: null,
    allowLabelCorrections: false,
  });

  assert.equal(result.approved.length, 0);
  assert.equal(result.unresolved.length, 1);
  assert.equal(result.unresolved[0].reason, "multiple_verified_candidates");
});
