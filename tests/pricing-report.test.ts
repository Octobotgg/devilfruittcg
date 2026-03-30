import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

Object.assign(process.env as Record<string, string | undefined>, { NODE_ENV: "test" });

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

type VerificationRun = {
  id: number;
  status: "running" | "completed" | "failed";
  startedAt: string;
  finishedAt: string | null;
  source: string;
  notes: string | null;
};

type VerificationResult = {
  cardPrintId: string;
  externalProductId: string | null;
  externalVariantId: string | null;
  tcgplayerProductId: string | null;
  justtcgPriceNm: number | null;
  tcgplayerMarketPrice: number | null;
  publishedPriceNmBefore: number | null;
  priceDeltaAbs: number | null;
  priceDeltaRatio: number | null;
  mappingIntegrityStatus: "verified" | "blocked" | "warning" | "mismatch" | "unknown";
  labelIntegrityStatus: "verified" | "normalized" | "fallback" | "blocked" | "unknown";
  verificationStatus:
    | "verified"
    | "drift_warning"
    | "mismatch"
    | "stale_provider"
    | "missing_tcgplayer_id"
    | "unpriced_no_variant"
    | "mapping_conflict";
  reason: string;
  checkedAt: string;
  rawTcgplayerPayload: Record<string, unknown> | null;
  cardPrintVariantLabel?: string | null;
  displayTreatmentLabel?: string | null;
};

type VerificationConflict = {
  verificationRunId: number;
  cardPrintId: string;
  externalProductId: string | null;
  externalVariantId: string | null;
  tcgplayerProductId: string | null;
  conflictType: string;
  expectedNumber: string | null;
  expectedSetCode: string | null;
  expectedName: string | null;
  providerNumber: string | null;
  providerSetName: string | null;
  providerProductName: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};

function createResult(overrides: Partial<VerificationResult>): VerificationResult {
  return {
    cardPrintId: "cp-1",
    externalProductId: "product-1",
    externalVariantId: "variant-1",
    tcgplayerProductId: "123",
    justtcgPriceNm: 12.5,
    tcgplayerMarketPrice: 12.5,
    publishedPriceNmBefore: 10,
    priceDeltaAbs: 2.5,
    priceDeltaRatio: 0.25,
    mappingIntegrityStatus: "verified",
    labelIntegrityStatus: "verified",
    verificationStatus: "verified",
    reason: "within_tolerance",
    checkedAt: "2026-03-27T01:00:00.000Z",
    rawTcgplayerPayload: { marketPrice: 12.5 },
    cardPrintVariantLabel: "Alternate Art",
    displayTreatmentLabel: "Alternate Art",
    ...overrides,
  };
}

function createConflict(overrides: Partial<VerificationConflict>): VerificationConflict {
  return {
    verificationRunId: 42,
    cardPrintId: "cp-1",
    externalProductId: "product-1",
    externalVariantId: "variant-1",
    tcgplayerProductId: "123",
    conflictType: "duplicate_product_assignment",
    expectedNumber: "OP01-001",
    expectedSetCode: "OP01",
    expectedName: "Monkey D. Luffy",
    providerNumber: "OP01-001",
    providerSetName: "Romance Dawn",
    providerProductName: "Monkey D. Luffy OP01-001",
    details: { duplicateProductCardPrintIds: ["cp-1", "cp-2"] },
    createdAt: "2026-03-27T01:00:00.000Z",
    ...overrides,
  };
}

test("buildPricingVerificationReport summarizes counts, buckets, and mismatch rankings", async () => {
  const { buildPricingVerificationReport } =
    await importModule<typeof import("../scripts/report-pricing-verification.mjs")>(
      "scripts/report-pricing-verification.mjs",
    );

  const verificationRun: VerificationRun = {
    id: 42,
    status: "completed",
    startedAt: "2026-03-27T00:00:00.000Z",
    finishedAt: "2026-03-27T01:00:00.000Z",
    source: "justtcg_incremental_refresh",
    notes: "manual audit",
  };

  const results = [
    createResult({
      cardPrintId: "cp-verified",
      justtcgPriceNm: 12.5,
      tcgplayerMarketPrice: 12.5,
      publishedPriceNmBefore: 10,
      priceDeltaAbs: 2.5,
      priceDeltaRatio: 0.25,
      verificationStatus: "verified",
      reason: "within_tolerance",
      cardPrintVariantLabel: "Alternate Art",
    }),
    createResult({
      cardPrintId: "cp-drift",
      justtcgPriceNm: 101,
      tcgplayerMarketPrice: 100.2,
      publishedPriceNmBefore: 100,
      priceDeltaAbs: 0.8,
      priceDeltaRatio: 0.007984031936127744,
      verificationStatus: "drift_warning",
      reason: "low_volatility_drift_warning",
      cardPrintVariantLabel: "Base",
    }),
    createResult({
      cardPrintId: "cp-mapping",
      externalProductId: "product-3",
      externalVariantId: "variant-3",
      tcgplayerProductId: "333",
      justtcgPriceNm: 5,
      tcgplayerMarketPrice: 5,
      publishedPriceNmBefore: null,
      priceDeltaAbs: null,
      priceDeltaRatio: null,
      mappingIntegrityStatus: "blocked",
      labelIntegrityStatus: "blocked",
      verificationStatus: "mapping_conflict",
      reason: "mapping_integrity_blocked",
      cardPrintVariantLabel: "Alternate Art",
    }),
    createResult({
      cardPrintId: "cp-missing-id",
      externalProductId: "product-4",
      externalVariantId: "variant-4",
      tcgplayerProductId: null,
      justtcgPriceNm: 7.5,
      tcgplayerMarketPrice: null,
      publishedPriceNmBefore: 6,
      priceDeltaAbs: null,
      priceDeltaRatio: null,
      verificationStatus: "missing_tcgplayer_id",
      reason: "missing_tcgplayer_id",
      cardPrintVariantLabel: "Base",
    }),
    createResult({
      cardPrintId: "cp-stale",
      externalProductId: "product-5",
      externalVariantId: "variant-5",
      tcgplayerProductId: "555",
      justtcgPriceNm: 8,
      tcgplayerMarketPrice: 8,
      publishedPriceNmBefore: 7,
      priceDeltaAbs: null,
      priceDeltaRatio: null,
      verificationStatus: "stale_provider",
      reason: "stale_provider",
      cardPrintVariantLabel: "Base",
    }),
    createResult({
      cardPrintId: "cp-mismatch",
      externalProductId: "product-6",
      externalVariantId: "variant-6",
      tcgplayerProductId: "666",
      justtcgPriceNm: 60,
      tcgplayerMarketPrice: 50,
      publishedPriceNmBefore: 55,
      priceDeltaAbs: 10,
      priceDeltaRatio: 0.2,
      verificationStatus: "mismatch",
      reason: "drift_blocked",
      cardPrintVariantLabel: "Base",
    }),
  ];

  const conflicts = [
    createConflict({
      verificationRunId: 42,
      cardPrintId: "cp-mapping",
      conflictType: "duplicate_product_assignment",
      details: { duplicateProductCardPrintIds: ["cp-mapping", "cp-other"] },
    }),
    createConflict({
      verificationRunId: 42,
      cardPrintId: "cp-mapping",
      conflictType: "ui_label_mismatch",
      details: { publishedDisplayTreatmentLabel: "Treasure Rare" },
    }),
  ];

  const report = buildPricingVerificationReport({
    verificationRun,
    results,
    conflicts,
  });

  assert.equal(report.verificationRun.id, 42);
  assert.equal(report.summary.totalCheckedRows, 6);
  assert.equal(report.summary.changedCandidateRows, 3);
  assert.equal(report.summary.mappingConflicts, 1);
  assert.equal(report.summary.verifiedRows, 1);
  assert.equal(report.summary.publishedRows, 2);
  assert.equal(report.summary.blockedRows, 4);
  assert.equal(report.summary.driftWarnings, 1);
  assert.equal(report.summary.missingTcgplayerId, 1);
  assert.equal(report.summary.rowsWithMappingConflicts, 1);
  assert.equal(report.summary.duplicateAssignments, 1);
  assert.equal(report.summary.labelMismatches, 1);

  assert.deepEqual(
    report.buckets.changedCandidateRows.map((row: { cardPrintId: string }) => row.cardPrintId),
    ["cp-mismatch", "cp-verified", "cp-drift"],
  );
  assert.deepEqual(report.buckets.mappingConflicts.map((row: { cardPrintId: string }) => row.cardPrintId), [
    "cp-mapping",
  ]);
  assert.deepEqual(report.buckets.missingTcgplayerId.map((row: { cardPrintId: string }) => row.cardPrintId), [
    "cp-missing-id",
  ]);
  assert.deepEqual(report.buckets.rowsWithMappingConflicts.map((row: { cardPrintId: string }) => row.cardPrintId), [
    "cp-mapping",
  ]);
  assert.deepEqual(report.buckets.duplicateAssignments.map((row: { cardPrintId: string }) => row.cardPrintId), [
    "cp-mapping",
  ]);
  assert.deepEqual(report.buckets.labelMismatches.map((row: { cardPrintId: string }) => row.cardPrintId), [
    "cp-mapping",
  ]);
  assert.deepEqual(report.buckets.driftWarnings.map((row: { cardPrintId: string }) => row.cardPrintId), [
    "cp-drift",
  ]);

  assert.deepEqual(
    report.topMismatchesByDollarDelta.map((row: { cardPrintId: string }) => row.cardPrintId),
    ["cp-mismatch", "cp-verified", "cp-drift"],
  );
  assert.deepEqual(
    report.topMismatchesByRatioDelta.map((row: { cardPrintId: string }) => row.cardPrintId),
    ["cp-verified", "cp-mismatch", "cp-drift"],
  );
  assert.deepEqual(report.conflictBreakdownByReason, [
    { reason: "duplicate_product_assignment", count: 1 },
    { reason: "ui_label_mismatch", count: 1 },
  ]);
});

test("buildPricingVerificationReport supports premium and high-value manual-review filtering", async () => {
  const { buildPricingVerificationReport } =
    await importModule<typeof import("../scripts/report-pricing-verification.mjs")>(
      "scripts/report-pricing-verification.mjs",
    );

  const verificationRun: VerificationRun = {
    id: 88,
    status: "completed",
    startedAt: "2026-03-27T00:00:00.000Z",
    finishedAt: "2026-03-27T01:00:00.000Z",
    source: "justtcg_incremental_refresh",
    notes: null,
  };

  const results = [
    createResult({
      cardPrintId: "cp-premium",
      justtcgPriceNm: 250,
      tcgplayerMarketPrice: 240,
      publishedPriceNmBefore: 220,
      priceDeltaAbs: 10,
      priceDeltaRatio: 0.041666666666666664,
      verificationStatus: "verified",
      reason: "within_tolerance",
      cardPrintVariantLabel: "Alternate Art",
    }),
    createResult({
      cardPrintId: "cp-base-high",
      justtcgPriceNm: 310,
      tcgplayerMarketPrice: 300,
      publishedPriceNmBefore: 295,
      priceDeltaAbs: 5,
      priceDeltaRatio: 0.016666666666666666,
      verificationStatus: "verified",
      reason: "within_tolerance",
      cardPrintVariantLabel: "Base",
    }),
    createResult({
      cardPrintId: "cp-base-low",
      justtcgPriceNm: 18,
      tcgplayerMarketPrice: 18,
      publishedPriceNmBefore: 17,
      priceDeltaAbs: 1,
      priceDeltaRatio: 0.05555555555555555,
      verificationStatus: "verified",
      reason: "within_tolerance",
      cardPrintVariantLabel: "Base",
    }),
  ];

  const premiumReport = buildPricingVerificationReport({
    verificationRun,
    results,
    conflicts: [],
    options: {
      premiumOnly: true,
    },
  });

  assert.equal(premiumReport.summary.totalCheckedRows, 1);
  assert.deepEqual(
    premiumReport.buckets.changedCandidateRows.map((row: { cardPrintId: string }) => row.cardPrintId),
    ["cp-premium"],
  );

  const highValueReport = buildPricingVerificationReport({
    verificationRun,
    results,
    conflicts: [],
    options: {
      highValueOnly: true,
      highValueThreshold: 200,
    },
  });

  assert.equal(highValueReport.summary.totalCheckedRows, 2);
  assert.deepEqual(
    highValueReport.buckets.changedCandidateRows.map((row: { cardPrintId: string }) => row.cardPrintId),
    ["cp-premium", "cp-base-high"],
  );
});

test("generatePricingVerificationReport reads the latest verification run when no run id is provided", async () => {
  const { generatePricingVerificationReport } =
    await importModule<typeof import("../scripts/report-pricing-verification.mjs")>(
      "scripts/report-pricing-verification.mjs",
    );

  const verificationRun: VerificationRun = {
    id: 99,
    status: "completed",
    startedAt: "2026-03-27T10:00:00.000Z",
    finishedAt: "2026-03-27T10:05:00.000Z",
    source: "justtcg_refresh",
    notes: "latest",
  };

  const calls: string[] = [];
  const adapter = {
    async loadLatestVerificationRun() {
      calls.push("loadLatestVerificationRun");
      return verificationRun;
    },
    async loadVerificationResults(verificationRunId: number) {
      calls.push(`loadVerificationResults:${verificationRunId}`);
      return [
        createResult({
          cardPrintId: "cp-latest",
          justtcgPriceNm: 40,
          tcgplayerMarketPrice: 39,
          publishedPriceNmBefore: 38,
          priceDeltaAbs: 1,
          priceDeltaRatio: 0.02564102564102564,
          verificationStatus: "verified",
          reason: "within_tolerance",
          cardPrintVariantLabel: "Base",
        }),
      ];
    },
    async loadVerificationConflicts(verificationRunId: number) {
      calls.push(`loadVerificationConflicts:${verificationRunId}`);
      return [];
    },
  };

  const report = await generatePricingVerificationReport({ adapter });

  assert.equal(report.verificationRun.id, 99);
  assert.deepEqual(calls, [
    "loadLatestVerificationRun",
    "loadVerificationResults:99",
    "loadVerificationConflicts:99",
  ]);
  assert.equal(report.summary.totalCheckedRows, 1);
});
