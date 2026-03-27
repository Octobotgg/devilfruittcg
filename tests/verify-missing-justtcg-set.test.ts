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

test("evaluateVerificationCard approves exact unlabeled matches when both sides are effectively base cards", async () => {
  const { evaluateVerificationCard } = await importModule("scripts/verify-missing-justtcg-set.mjs");

  const card = {
    id: "card-4b",
    name: "Monkey D. Luffy",
    printedCardId: "OP01-004",
    set: "Romance Dawn [OP01]",
    releaseCode: "OP01",
    variantType: "",
    variantLabel: "",
  };

  const result = evaluateVerificationCard({
    card,
    expectedNumber: "OP01-004",
    releaseCode: "OP01",
    candidateResults: [
      {
        candidate: {
          id: "candidate-6b",
          name: "Monkey D. Luffy OP01-004",
          number: "OP01-004",
          set_name: "Romance Dawn",
          variants: [{ condition: "near mint", price: 15 }],
          tcgplayerId: "124",
        },
        tcgplayerId: "124",
        detail: {
          productName: "Monkey D. Luffy OP01-004",
          productUrlName: "monkey-d-luffy-op01-004",
          setName: "Romance Dawn",
          productLineName: "One Piece Card Game",
          customAttributes: { number: "OP01-004" },
          formattedAttributes: { Number: "OP01-004" },
        },
      },
    ],
    ebayPrice: null,
    allowLabelCorrections: false,
  });

  assert.equal(result.approved.length, 1);
  assert.equal(result.unresolved.length, 0);
});

test("evaluateVerificationCard approves unlabeled PRB01 base-card matches", async () => {
  const { evaluateVerificationCard } = await importModule("scripts/verify-missing-justtcg-set.mjs");

  const card = {
    id: "card-prb01",
    name: "Monkey D. Luffy",
    printedCardId: "PRB01-001",
    set: "Premium Booster The Best [PRB01]",
    releaseCode: "PRB01",
    variantType: "",
    variantLabel: "",
  };

  const result = evaluateVerificationCard({
    card,
    expectedNumber: "PRB01-001",
    releaseCode: "PRB01",
    candidateResults: [
      {
        candidate: {
          id: "candidate-prb01",
          name: "Monkey D. Luffy PRB01-001",
          number: "PRB01-001",
          set_name: "Premium Booster The Best",
          variants: [{ condition: "near mint", price: 15 }],
          tcgplayerId: "124",
        },
        tcgplayerId: "124",
        detail: {
          productName: "Monkey D. Luffy PRB01-001",
          productUrlName: "monkey-d-luffy-prb01-001",
          setName: "Premium Booster The Best",
          productLineName: "One Piece Card Game",
          customAttributes: { number: "PRB01-001" },
          formattedAttributes: { Number: "PRB01-001" },
        },
      },
    ],
    ebayPrice: null,
    allowLabelCorrections: false,
  });

  assert.equal(result.approved.length, 1);
  assert.equal(result.unresolved.length, 0);
});

test("evaluateVerificationCard approves unlabeled base-card matches even when rare appears in the title", async () => {
  const { evaluateVerificationCard } = await importModule("scripts/verify-missing-justtcg-set.mjs");

  const card = {
    id: "card-rare",
    name: "Monkey D. Luffy",
    printedCardId: "PRB02-001",
    set: "Premium Booster The Best Vol. 2 [PRB02]",
    releaseCode: "PRB02",
    variantType: "",
    variantLabel: "",
  };

  const result = evaluateVerificationCard({
    card,
    expectedNumber: "PRB02-001",
    releaseCode: "PRB02",
    candidateResults: [
      {
        candidate: {
          id: "candidate-rare",
          name: "Monkey D. Luffy Rare PRB02-001",
          number: "PRB02-001",
          set_name: "Premium Booster The Best Vol. 2",
          variants: [{ condition: "near mint", price: 15 }],
          tcgplayerId: "125",
        },
        tcgplayerId: "125",
        detail: {
          productName: "Monkey D. Luffy Rare PRB02-001",
          productUrlName: "monkey-d-luffy-rare-prb02-001",
          setName: "Premium Booster The Best Vol. 2",
          productLineName: "One Piece Card Game",
          customAttributes: { number: "PRB02-001" },
          formattedAttributes: { Number: "PRB02-001" },
        },
      },
    ],
    ebayPrice: null,
    allowLabelCorrections: false,
  });

  assert.equal(result.approved.length, 1);
  assert.equal(result.unresolved.length, 0);
});

test("evaluateVerificationCard approves exact labeled Full Art matches", async () => {
  const { evaluateVerificationCard } = await importModule("scripts/verify-missing-justtcg-set.mjs");

  const card = {
    id: "card-full-art-exact",
    name: "Monkey D. Luffy",
    printedCardId: "OP01-004",
    set: "Romance Dawn [OP01]",
    releaseCode: "OP01",
    variantType: "alt_art",
    variantLabel: "Full Art",
  };

  const result = evaluateVerificationCard({
    card,
    expectedNumber: "OP01-004",
    releaseCode: "OP01",
    candidateResults: [
      {
        candidate: {
          id: "candidate-full-art-exact",
          name: "Monkey D. Luffy Full Art OP01-004",
          number: "OP01-004",
          set_name: "Romance Dawn",
          variants: [{ condition: "near mint", price: 15 }],
          tcgplayerId: "124",
        },
        tcgplayerId: "124",
        detail: {
          productName: "Monkey D. Luffy Full Art OP01-004",
          productUrlName: "monkey-d-luffy-full-art-op01-004",
          setName: "Romance Dawn",
          productLineName: "One Piece Card Game",
          customAttributes: { number: "OP01-004" },
          formattedAttributes: { Number: "OP01-004" },
        },
      },
    ],
    ebayPrice: null,
    allowLabelCorrections: false,
  });

  assert.equal(result.approved.length, 1);
  assert.equal(result.unresolved.length, 0);
});

test("evaluateVerificationCard approves exact labeled Winner Pack and Event Pack matches", async () => {
  const { evaluateVerificationCard } = await importModule("scripts/verify-missing-justtcg-set.mjs");

  const cases = [
    {
      card: {
        id: "card-winner-pack-exact",
        name: "Monkey D. Luffy",
        printedCardId: "PRB01-001",
        set: "Premium Booster The Best [PRB01]",
        releaseCode: "PRB01",
        variantType: "sp",
        variantLabel: "Winner Pack",
      },
      candidate: {
        id: "candidate-winner-pack-exact",
        name: "Monkey D. Luffy SP PRB01-001",
        number: "PRB01-001",
        set_name: "Premium Booster The Best",
        variants: [{ condition: "near mint", price: 15 }],
        tcgplayerId: "124",
      },
      detail: {
        productName: "Monkey D. Luffy SP PRB01-001",
        productUrlName: "monkey-d-luffy-sp-prb01-001",
        setName: "Premium Booster The Best",
        productLineName: "One Piece Card Game",
        customAttributes: { number: "PRB01-001" },
        formattedAttributes: { Number: "PRB01-001" },
      },
    },
    {
      card: {
        id: "card-event-pack-exact",
        name: "Monkey D. Luffy",
        printedCardId: "PRB01-001",
        set: "Premium Booster The Best [PRB01]",
        releaseCode: "PRB01",
        variantType: "sp",
        variantLabel: "Event Pack",
      },
      candidate: {
        id: "candidate-event-pack-exact",
        name: "Monkey D. Luffy SP PRB01-001",
        number: "PRB01-001",
        set_name: "Premium Booster The Best",
        variants: [{ condition: "near mint", price: 15 }],
        tcgplayerId: "125",
      },
      detail: {
        productName: "Monkey D. Luffy SP PRB01-001",
        productUrlName: "monkey-d-luffy-sp-prb01-001",
        setName: "Premium Booster The Best",
        productLineName: "One Piece Card Game",
        customAttributes: { number: "PRB01-001" },
        formattedAttributes: { Number: "PRB01-001" },
      },
    },
  ];

  for (const testCase of cases) {
    const result = evaluateVerificationCard({
      card: testCase.card,
      expectedNumber: "PRB01-001",
      releaseCode: "PRB01",
      candidateResults: [
        {
          candidate: testCase.candidate,
          tcgplayerId: testCase.candidate.tcgplayerId,
          detail: testCase.detail,
        },
      ],
      ebayPrice: null,
      allowLabelCorrections: false,
    });

    assert.equal(result.approved.length, 1);
    assert.equal(result.unresolved.length, 0);
  }
});

test("evaluateVerificationCard approves exact labeled Jolly Roger Foil and Reprint matches", async () => {
  const { evaluateVerificationCard } = await importModule("scripts/verify-missing-justtcg-set.mjs");

  const cases = [
    {
      card: {
        id: "card-jolly-roger-foil-exact",
        name: "Monkey D. Luffy",
        printedCardId: "OP01-004",
        set: "Romance Dawn [OP01]",
        releaseCode: "OP01",
        variantType: "parallel",
        variantLabel: "Jolly Roger Foil",
      },
      candidate: {
        id: "candidate-jolly-roger-foil-exact",
        name: "Monkey D. Luffy Parallel OP01-004",
        number: "OP01-004",
        set_name: "Romance Dawn",
        variants: [{ condition: "near mint", price: 15 }],
        tcgplayerId: "126",
      },
      detail: {
        productName: "Monkey D. Luffy Parallel OP01-004",
        productUrlName: "monkey-d-luffy-parallel-op01-004",
        setName: "Romance Dawn",
        productLineName: "One Piece Card Game",
        customAttributes: { number: "OP01-004" },
        formattedAttributes: { Number: "OP01-004" },
      },
    },
    {
      card: {
        id: "card-reprint-exact",
        name: "Monkey D. Luffy",
        printedCardId: "OP01-004",
        set: "Romance Dawn [OP01]",
        releaseCode: "OP01",
        variantType: "parallel",
        variantLabel: "Reprint",
      },
      candidate: {
        id: "candidate-reprint-exact",
        name: "Monkey D. Luffy Parallel OP01-004",
        number: "OP01-004",
        set_name: "Romance Dawn",
        variants: [{ condition: "near mint", price: 15 }],
        tcgplayerId: "127",
      },
      detail: {
        productName: "Monkey D. Luffy Parallel OP01-004",
        productUrlName: "monkey-d-luffy-parallel-op01-004",
        setName: "Romance Dawn",
        productLineName: "One Piece Card Game",
        customAttributes: { number: "OP01-004" },
        formattedAttributes: { Number: "OP01-004" },
      },
    },
  ];

  for (const testCase of cases) {
    const result = evaluateVerificationCard({
      card: testCase.card,
      expectedNumber: "OP01-004",
      releaseCode: "OP01",
      candidateResults: [
        {
          candidate: testCase.candidate,
          tcgplayerId: testCase.candidate.tcgplayerId,
          detail: testCase.detail,
        },
      ],
      ebayPrice: null,
      allowLabelCorrections: false,
    });

    assert.equal(result.approved.length, 1);
    assert.equal(result.unresolved.length, 0);
  }
});

test("evaluateVerificationCard does not auto-approve unlabeled premium-looking cards like Box Topper", async () => {
  const { evaluateVerificationCard } = await importModule("scripts/verify-missing-justtcg-set.mjs");

  const card = {
    id: "card-4c",
    name: "Monkey D. Luffy",
    printedCardId: "OP01-004",
    set: "Romance Dawn [OP01]",
    releaseCode: "OP01",
    variantType: "",
    variantLabel: "",
  };

  const result = evaluateVerificationCard({
    card,
    expectedNumber: "OP01-004",
    releaseCode: "OP01",
    candidateResults: [
      {
        candidate: {
          id: "candidate-6c",
          name: "Monkey D. Luffy Box Topper OP01-004",
          number: "OP01-004",
          set_name: "Romance Dawn",
          variants: [{ condition: "near mint", price: 15 }],
          tcgplayerId: "124",
        },
        tcgplayerId: "124",
        detail: {
          productName: "Monkey D. Luffy Box Topper OP01-004",
          productUrlName: "monkey-d-luffy-box-topper-op01-004",
          setName: "Romance Dawn",
          productLineName: "One Piece Card Game",
          customAttributes: { number: "OP01-004" },
          formattedAttributes: { Number: "OP01-004" },
        },
      },
    ],
    ebayPrice: null,
    allowLabelCorrections: false,
  });

  assert.equal(result.approved.length, 0);
  assert.equal(result.unresolved.length, 1);
  assert.equal(result.unresolved[0].reason, "no_verified_candidate");
});

test("evaluateVerificationCard approves unlabeled base cards for Silvers Rayleigh without treating silver as premium", async () => {
  const { evaluateVerificationCard } = await importModule("scripts/verify-missing-justtcg-set.mjs");

  const card = {
    id: "card-silvers-rayleigh",
    name: "Silvers Rayleigh",
    printedCardId: "OP02-001",
    set: "Paramount War [OP02]",
    releaseCode: "OP02",
    variantType: "",
    variantLabel: "",
  };

  const result = evaluateVerificationCard({
    card,
    expectedNumber: "OP02-001",
    releaseCode: "OP02",
    candidateResults: [
      {
        candidate: {
          id: "candidate-silvers-rayleigh",
          name: "Silvers Rayleigh OP02-001",
          number: "OP02-001",
          set_name: "Paramount War",
          variants: [{ condition: "near mint", price: 15 }],
          tcgplayerId: "128",
        },
        tcgplayerId: "128",
        detail: {
          productName: "Silvers Rayleigh OP02-001",
          productUrlName: "silvers-rayleigh-op02-001",
          setName: "Paramount War",
          productLineName: "One Piece Card Game",
          customAttributes: { number: "OP02-001" },
          formattedAttributes: { Number: "OP02-001" },
        },
      },
    ],
    ebayPrice: null,
    allowLabelCorrections: false,
  });

  assert.equal(result.approved.length, 1);
  assert.equal(result.unresolved.length, 0);
});

test("evaluateVerificationCard does not auto-approve unlabeled Full Art cards", async () => {
  const { evaluateVerificationCard } = await importModule("scripts/verify-missing-justtcg-set.mjs");

  const card = {
    id: "card-full-art",
    name: "Monkey D. Luffy",
    printedCardId: "OP01-004",
    set: "Romance Dawn [OP01]",
    releaseCode: "OP01",
    variantType: "",
    variantLabel: "",
  };

  const result = evaluateVerificationCard({
    card,
    expectedNumber: "OP01-004",
    releaseCode: "OP01",
    candidateResults: [
      {
        candidate: {
          id: "candidate-full-art",
          name: "Monkey D. Luffy Full Art OP01-004",
          number: "OP01-004",
          set_name: "Romance Dawn",
          variants: [{ condition: "near mint", price: 15 }],
          tcgplayerId: "124",
        },
        tcgplayerId: "124",
        detail: {
          productName: "Monkey D. Luffy Full Art OP01-004",
          productUrlName: "monkey-d-luffy-full-art-op01-004",
          setName: "Romance Dawn",
          productLineName: "One Piece Card Game",
          customAttributes: { number: "OP01-004" },
          formattedAttributes: { Number: "OP01-004" },
        },
      },
    ],
    ebayPrice: null,
    allowLabelCorrections: false,
  });

  assert.equal(result.approved.length, 0);
  assert.equal(result.unresolved.length, 1);
});

test("evaluateVerificationCard does not auto-approve unlabeled Winner Pack or Event Pack cards", async () => {
  const { evaluateVerificationCard } = await importModule("scripts/verify-missing-justtcg-set.mjs");

  const card = {
    id: "card-winner-pack",
    name: "Monkey D. Luffy",
    printedCardId: "PRB01-001",
    set: "Premium Booster The Best [PRB01]",
    releaseCode: "PRB01",
    variantType: "",
    variantLabel: "",
  };

  const result = evaluateVerificationCard({
    card,
    expectedNumber: "PRB01-001",
    releaseCode: "PRB01",
    candidateResults: [
      {
        candidate: {
          id: "candidate-winner-pack",
          name: "Monkey D. Luffy Winner Pack PRB01-001",
          number: "PRB01-001",
          set_name: "Premium Booster The Best",
          variants: [{ condition: "near mint", price: 15 }],
          tcgplayerId: "124",
        },
        tcgplayerId: "124",
        detail: {
          productName: "Monkey D. Luffy Winner Pack PRB01-001",
          productUrlName: "monkey-d-luffy-winner-pack-prb01-001",
          setName: "Premium Booster The Best",
          productLineName: "One Piece Card Game",
          customAttributes: { number: "PRB01-001" },
          formattedAttributes: { Number: "PRB01-001" },
        },
      },
      {
        candidate: {
          id: "candidate-event-pack",
          name: "Monkey D. Luffy Event Pack PRB01-001",
          number: "PRB01-001",
          set_name: "Premium Booster The Best",
          variants: [{ condition: "near mint", price: 15 }],
          tcgplayerId: "125",
        },
        tcgplayerId: "125",
        detail: {
          productName: "Monkey D. Luffy Event Pack PRB01-001",
          productUrlName: "monkey-d-luffy-event-pack-prb01-001",
          setName: "Premium Booster The Best",
          productLineName: "One Piece Card Game",
          customAttributes: { number: "PRB01-001" },
          formattedAttributes: { Number: "PRB01-001" },
        },
      },
    ],
    ebayPrice: null,
    allowLabelCorrections: false,
  });

  assert.equal(result.approved.length, 0);
  assert.equal(result.unresolved.length, 1);
  assert.equal(result.unresolved[0].reason, "no_verified_candidate");
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

test("evaluateVerificationCard rejects blank set metadata even when other fields match", async () => {
  const { evaluateVerificationCard } = await importModule("scripts/verify-missing-justtcg-set.mjs");

  const card = {
    id: "card-6",
    name: "Monkey D. Luffy",
    printedCardId: "OP01-006",
    set: "Romance Dawn [OP01]",
    releaseCode: "OP01",
    variantType: "parallel",
    variantLabel: "Parallel",
  };

  const result = evaluateVerificationCard({
    card,
    expectedNumber: "OP01-006",
    releaseCode: "OP01",
    candidateResults: [
      {
        candidate: {
          id: "candidate-9",
          name: "Monkey D. Luffy Parallel OP01-006",
          number: "OP01-006",
          set_name: "",
          variants: [{ condition: "near mint", price: 11 }],
          tcgplayerId: "127",
        },
        tcgplayerId: "127",
        detail: {
          productName: "Monkey D. Luffy Parallel OP01-006",
          productUrlName: "monkey-d-luffy-parallel-op01-006",
          setName: "",
          productLineName: "One Piece Card Game",
          customAttributes: { number: "OP01-006" },
          formattedAttributes: { Number: "OP01-006" },
        },
      },
    ],
    ebayPrice: null,
    allowLabelCorrections: false,
  });

  assert.equal(result.approved.length, 0);
  assert.equal(result.unresolved.length, 1);
  assert.equal(result.unresolved[0].reason, "no_verified_candidate");
});
