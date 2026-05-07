import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

Object.assign(process.env as Record<string, string | undefined>, { NODE_ENV: "test" });

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

test("pricing publisher module can be imported from plain Node scripts in development mode", () => {
  const moduleUrl = pathToFileURL(path.join(REPO_ROOT, "lib/server/pricing/pricing-publisher.ts")).href;
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--input-type=module",
      "--eval",
      `await import(${JSON.stringify(moduleUrl)});`,
    ],
    {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        NODE_ENV: "development",
      },
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("bootstrap adapter can be created from plain Node scripts without module-loader races", () => {
  const scriptUrl = pathToFileURL(path.join(REPO_ROOT, "scripts/bootstrap-published-pricing.mjs")).href;
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--input-type=module",
      "--eval",
      `const mod = await import(${JSON.stringify(scriptUrl)}); await mod.createPostgresBootstrapAdapter({ unsafe() { throw new Error('unused'); }, begin() { throw new Error('unused'); } });`,
    ],
    {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        NODE_ENV: "development",
      },
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("publish adapter can be created from plain Node scripts without module-loader races", () => {
  const scriptUrl = pathToFileURL(path.join(REPO_ROOT, "scripts/publish-verified-prices.mjs")).href;
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--input-type=module",
      "--eval",
      `const mod = await import(${JSON.stringify(scriptUrl)}); await mod.createPostgresPublishAdapter({ unsafe() { throw new Error('unused'); }, begin() { throw new Error('unused'); } });`,
    ],
    {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        NODE_ENV: "development",
      },
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
});

type Candidate = {
  cardPrintId: string;
  sourceId: string;
  externalProductId: string | null;
  externalVariantId: string | null;
  productKind?: string | null;
  currentCandidatePriced?: boolean;
  verificationStatus:
    | "verified"
    | "drift_warning"
    | "mismatch"
    | "stale_provider"
    | "missing_tcgplayer_id"
    | "unpriced_no_variant"
    | "mapping_conflict";
  conflictTypes?: string[];
  priceMarket: number | null;
  priceNm: number | null;
  priceLp: number | null;
  updatedAt: string | null;
  displaySetName?: string | null;
  displaySetCode?: string | null;
  displayRarity?: string | null;
  displayTitle?: string | null;
  displayTreatmentLabel?: string | null;
  displayImageUrl?: string | null;
  labelStatus?: "verified" | "normalized" | "fallback" | "blocked" | "unknown";
  officialName?: string | null;
  officialSetName?: string | null;
  officialSetCode?: string | null;
  officialRarity?: string | null;
};

type PublishedPriceRow = {
  cardPrintId: string;
  sourceId: string;
  externalProductId: string;
  externalVariantId: string;
  priceMarket: number | null;
  priceNm: number | null;
  priceLp: number | null;
  updatedAt: string;
  publishedAt: string;
  verificationStatus: string;
  verificationRunId: number;
};

type PublishedDisplayRow = {
  cardPrintId: string;
  externalProductId: string;
  externalVariantId: string;
  displaySetName: string;
  displaySetCode: string;
  displayRarity: string | null;
  displayTitle: string;
  displayTreatmentLabel: string | null;
  displayImageUrl: string | null;
  labelStatus: string;
  verificationRunId: number;
  publishedAt: string;
};

type VerificationResultRow = {
  verificationRunId: number;
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
};

function createCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    cardPrintId: "cp-1",
    sourceId: "justtcg",
    externalProductId: "product-1",
    externalVariantId: "variant-1",
    productKind: "raw_card",
    verificationStatus: "verified",
    conflictTypes: [],
    priceMarket: 14.25,
    priceNm: 12.5,
    priceLp: 10.25,
    updatedAt: "2026-03-27T00:00:00.000Z",
    displaySetName: "Romance Dawn",
    displaySetCode: "OP01",
    displayRarity: "SR",
    displayTitle: "Monkey D. Luffy",
    displayTreatmentLabel: "Alternate Art",
    displayImageUrl: "https://img.example/luffy.jpg",
    labelStatus: "normalized",
    officialName: "Monkey D. Luffy",
    officialSetName: "Romance Dawn",
    officialSetCode: "OP01",
    officialRarity: "SR",
    ...overrides,
  };
}

function createVerificationInput(overrides: {
  cardPrint?: Record<string, unknown>;
  provider?: Record<string, unknown>;
  publishedDisplay?: Record<string, unknown> | null;
  justtcgPriceNm?: number | null;
  tcgplayerMarketPrice?: number | null;
  providerUpdatedAt?: string | null;
  checkedAt?: string | null;
  duplicateVariantCardPrintIds?: string[];
  duplicateProductCardPrintIds?: string[];
} = {}) {
  return {
    cardPrint: {
      id: "cp-1",
      number: "OP01-001",
      setCode: "OP01",
      setName: "Romance Dawn [OP01]",
      title: "Monkey D. Luffy",
      rarity: "SR",
      treatmentLabel: null,
      imageUrl: "https://img.example/luffy.jpg",
      ...overrides.cardPrint,
    },
    provider: {
      externalProductId: "product-1",
      externalVariantId: "variant-1",
      productKind: "raw_card",
      tcgplayerProductId: "123",
      productName: "Monkey D. Luffy OP01-001",
      productUrlName: "monkey-d-luffy-op01-001",
      setName: "Romance Dawn",
      number: "OP01-001",
      treatment: null,
      imageUrl: "https://img.example/provider-luffy.jpg",
      ...overrides.provider,
    },
    publishedDisplay: overrides.publishedDisplay ?? null,
    justtcgPriceNm: overrides.justtcgPriceNm ?? 12.5,
    tcgplayerMarketPrice: overrides.tcgplayerMarketPrice ?? 12.5,
    providerUpdatedAt: overrides.providerUpdatedAt ?? "2026-03-27T00:00:00.000Z",
    checkedAt: overrides.checkedAt ?? "2026-03-27T01:00:00.000Z",
    duplicateVariantCardPrintIds: overrides.duplicateVariantCardPrintIds ?? [],
    duplicateProductCardPrintIds: overrides.duplicateProductCardPrintIds ?? [],
  };
}

function createFakeAdapter(options?: { throwOnDisplay?: boolean }) {
  const state = {
    publishedPrices: new Map<string, PublishedPriceRow>(),
    publishedDisplays: new Map<string, PublishedDisplayRow>(),
    verificationRuns: new Map<
      number,
      { status: string; startedAt: string; finishedAt: string | null; notes: string | null; source: string }
    >(),
    verificationResults: [] as VerificationResultRow[],
    runs: new Map<number, { status: string; finishedAt: string | null; notes: string | null }>(),
    conflicts: [] as Array<{ verificationRunId: number; cardPrintId: string; conflictType: string }>,
    operations: [] as string[],
    nextRunId: 100,
  };

  const snapshot = () => ({
    publishedPrices: new Map(state.publishedPrices),
    publishedDisplays: new Map(state.publishedDisplays),
    verificationRuns: new Map(
      Array.from(state.verificationRuns.entries(), ([key, value]) => [key, { ...value }]),
    ),
    verificationResults: state.verificationResults.map((entry) => ({ ...entry })),
    runs: new Map(
      Array.from(state.runs.entries(), ([key, value]) => [key, { ...value }]),
    ),
    conflicts: state.conflicts.map((entry) => ({ ...entry })),
    operations: [...state.operations],
  });

  const restore = (value: ReturnType<typeof snapshot>) => {
    state.publishedPrices = value.publishedPrices;
    state.publishedDisplays = value.publishedDisplays;
    state.verificationRuns = value.verificationRuns;
    state.verificationResults = value.verificationResults;
    state.runs = value.runs;
    state.conflicts = value.conflicts;
    state.operations = value.operations;
  };

  return {
    state,
    async transaction<T>(work: () => Promise<T>) {
      const before = snapshot();
      state.operations.push("transaction:start");
      try {
        const result = await work();
        state.operations.push("transaction:commit");
        return result;
      } catch (error) {
        restore(before);
        state.operations.push("transaction:rollback");
        throw error;
      }
    },
    async upsertPublishedPrices(rows: PublishedPriceRow[]) {
      state.operations.push(`prices:${rows.length}`);
      for (const row of rows) {
        state.publishedPrices.set(`${row.cardPrintId}:${row.sourceId}`, row);
      }
    },
    async upsertPublishedDisplays(rows: PublishedDisplayRow[]) {
      state.operations.push(`displays:${rows.length}`);
      if (options?.throwOnDisplay) {
        throw new Error("display write failed");
      }

      for (const row of rows) {
        state.publishedDisplays.set(row.cardPrintId, row);
      }
    },
    async insertVerificationResults(
      verificationRunId: number,
      results: VerificationResultRow[],
    ) {
      state.operations.push(`verification:results:${results.length}`);
      state.verificationResults.push(
        ...results.map((row) => ({
          ...row,
          verificationRunId,
        })),
      );
    },
    async recordConflicts(
      verificationRunId: number,
      conflicts: Array<{ cardPrintId: string; conflictType: string }>,
    ) {
      state.operations.push(`conflicts:${conflicts.length}`);
      state.conflicts.push(
        ...conflicts.map((entry) => ({
          verificationRunId,
          cardPrintId: entry.cardPrintId,
          conflictType: entry.conflictType,
        })),
      );
    },
    async markRunCompleted(verificationRunId: number, finishedAt: string) {
      state.operations.push("run:completed");
      state.runs.set(verificationRunId, {
        status: "completed",
        finishedAt,
        notes: null,
      });
      if (state.verificationRuns.has(verificationRunId)) {
        const run = state.verificationRuns.get(verificationRunId)!;
        state.verificationRuns.set(verificationRunId, { ...run, status: "completed", finishedAt });
      }
    },
    async markRunFailed(verificationRunId: number, finishedAt: string, notes: string | null) {
      state.operations.push("run:failed");
      state.runs.set(verificationRunId, {
        status: "failed",
        finishedAt,
        notes,
      });
      if (state.verificationRuns.has(verificationRunId)) {
        const run = state.verificationRuns.get(verificationRunId)!;
        state.verificationRuns.set(verificationRunId, { ...run, status: "failed", finishedAt, notes });
      }
    },
    async createVerificationRun(source: string, notes: string | null, startedAt: string) {
      const runId = state.nextRunId;
      state.nextRunId += 1;
      state.operations.push("run:created");
      state.verificationRuns.set(runId, {
        status: "running",
        startedAt,
        finishedAt: null,
        notes,
        source,
      });
      state.runs.set(runId, {
        status: "running",
        finishedAt: null,
        notes: notes || `${source}@${startedAt}`,
      });
      return runId;
    },
    async listPublishedCoverage(cardPrintIds: string[]) {
      const priceCardPrintIds = new Set<string>();
      const displayCardPrintIds = new Set<string>();
      for (const cardPrintId of cardPrintIds) {
        if (state.publishedPrices.has(`${cardPrintId}:justtcg`)) {
          priceCardPrintIds.add(cardPrintId);
        }
        if (state.publishedDisplays.has(cardPrintId)) {
          displayCardPrintIds.add(cardPrintId);
        }
      }
      return { priceCardPrintIds, displayCardPrintIds };
    },
  };
}

test("runPricingVerification records blocked statuses before publish and publishVerifiedPrices only publishes safe rows", async () => {
  const { runPricingVerification } =
    await importModule<typeof import("../scripts/run-pricing-verification.mjs")>(
      "scripts/run-pricing-verification.mjs",
    );
  const { publishVerifiedPrices } =
    await importModule<typeof import("../scripts/publish-verified-prices.mjs")>(
      "scripts/publish-verified-prices.mjs",
    );

  const adapter = createFakeAdapter();
  adapter.state.publishedPrices.set("cp-safe:justtcg", {
    cardPrintId: "cp-safe",
    sourceId: "justtcg",
    externalProductId: "product-old",
    externalVariantId: "variant-old",
    priceMarket: 11.25,
    priceNm: 11.25,
    priceLp: 9.5,
    updatedAt: "2026-03-26T00:00:00.000Z",
    publishedAt: "2026-03-26T00:05:00.000Z",
    verificationStatus: "verified",
    verificationRunId: 99,
  });
  adapter.state.publishedDisplays.set("cp-safe", {
    cardPrintId: "cp-safe",
    externalProductId: "product-old",
    externalVariantId: "variant-old",
    displaySetName: "Romance Dawn",
    displaySetCode: "OP01",
    displayRarity: "SR",
    displayTitle: "Monkey D. Luffy",
    displayTreatmentLabel: "Treasure Rare",
    displayImageUrl: "https://img.example/old.jpg",
    labelStatus: "verified",
    verificationRunId: 99,
    publishedAt: "2026-03-26T00:05:00.000Z",
  });

  const verification = await runPricingVerification({
    source: "justtcg_refresh",
    candidates: [
      {
        ...createVerificationInput({
          cardPrint: { id: "cp-safe" },
          provider: { externalProductId: "product-safe", externalVariantId: "variant-safe", tcgplayerProductId: "111" },
          justtcgPriceNm: 12.5,
          tcgplayerMarketPrice: 12.48,
          publishedDisplay: {
            displayTitle: "Monkey D. Luffy",
            displaySetName: "Romance Dawn",
            displaySetCode: "OP01",
            displayRarity: "SR",
            displayTreatmentLabel: "Treasure Rare",
            displayImageUrl: "https://img.example/luffy.jpg",
            labelStatus: "verified",
          },
        }),
      },
      {
        ...createVerificationInput({
          cardPrint: { id: "cp-stale" },
          provider: { externalProductId: "product-stale", externalVariantId: "variant-stale", tcgplayerProductId: "112" },
          providerUpdatedAt: "2026-03-20T00:00:00.000Z",
        }),
      },
      {
        ...createVerificationInput({
          cardPrint: { id: "cp-missing-id" },
          provider: { externalProductId: "product-missing", externalVariantId: "variant-missing", tcgplayerProductId: null },
        }),
      },
      {
        ...createVerificationInput({
          cardPrint: { id: "cp-unpriced" },
          provider: { externalProductId: "product-unpriced", externalVariantId: null, tcgplayerProductId: "113" },
          justtcgPriceNm: null,
        }),
      },
      {
        ...createVerificationInput({
          cardPrint: { id: "cp-conflict" },
          provider: { externalProductId: "product-conflict", externalVariantId: "variant-conflict", tcgplayerProductId: "114" },
          duplicateProductCardPrintIds: ["cp-alt"],
        }),
      },
    ],
    publishedPriceRowsByCardPrintId: new Map([
      [
        "cp-safe",
        {
          priceNm: 11.25,
          publishedAt: "2026-03-26T00:05:00.000Z",
        },
      ],
    ]),
    adapter,
    now: () => "2026-03-27T12:00:00.000Z",
  });

  assert.equal(adapter.state.verificationRuns.get(verification.verificationRunId)?.status, "running");
  assert.equal(adapter.state.verificationResults.length, 5);
  assert.deepEqual(
    adapter.state.verificationResults.map((row) => row.verificationStatus).sort(),
    ["mapping_conflict", "missing_tcgplayer_id", "stale_provider", "unpriced_no_variant", "verified"].sort(),
  );
  assert.equal(adapter.state.verificationResults.find((row) => row.cardPrintId === "cp-safe")?.publishedPriceNmBefore, 11.25);
  assert.deepEqual(adapter.state.conflicts.map((row) => row.conflictType), ["duplicate_product_assignment"]);

  await publishVerifiedPrices({
    verificationRunId: verification.verificationRunId,
    candidates: verification.publishableCandidates,
    adapter,
    now: () => "2026-03-27T12:05:00.000Z",
  });

  assert.equal(adapter.state.verificationRuns.get(verification.verificationRunId)?.status, "completed");
  assert.equal(adapter.state.publishedPrices.get("cp-safe:justtcg")?.externalProductId, "product-safe");
  assert.equal(adapter.state.publishedDisplays.get("cp-safe")?.displayImageUrl, "https://img.example/luffy.jpg");
  assert.equal(adapter.state.publishedPrices.has("cp-stale:justtcg"), false);
  assert.equal(adapter.state.publishedPrices.has("cp-missing-id:justtcg"), false);
  assert.equal(adapter.state.publishedPrices.has("cp-unpriced:justtcg"), false);
  assert.equal(adapter.state.publishedPrices.has("cp-conflict:justtcg"), false);
  assert.equal(adapter.state.publishedPrices.get("cp-safe:justtcg")?.verificationStatus, "verified");
});

test("publishVerifiedPrices rolls back partial writes and keeps previously published rows when one row fails mid-run", async () => {
  const { publishVerifiedPrices } =
    await importModule<typeof import("../scripts/publish-verified-prices.mjs")>(
      "scripts/publish-verified-prices.mjs",
    );

  const adapter = createFakeAdapter({ throwOnDisplay: true });
  adapter.state.publishedPrices.set("cp-keep:justtcg", {
    cardPrintId: "cp-keep",
    sourceId: "justtcg",
    externalProductId: "product-keep",
    externalVariantId: "variant-keep",
    priceMarket: 7.2,
    priceNm: 6.9,
    priceLp: 5.75,
    updatedAt: "2026-03-25T00:00:00.000Z",
    publishedAt: "2026-03-25T00:05:00.000Z",
    verificationStatus: "verified",
    verificationRunId: 41,
  });
  adapter.state.publishedDisplays.set("cp-keep", {
    cardPrintId: "cp-keep",
    externalProductId: "product-keep",
    externalVariantId: "variant-keep",
    displaySetName: "Romance Dawn",
    displaySetCode: "OP01",
    displayRarity: "SR",
    displayTitle: "Monkey D. Luffy",
    displayTreatmentLabel: "Treasure Rare",
    displayImageUrl: "https://img.example/keep.jpg",
    labelStatus: "verified",
    verificationRunId: 41,
    publishedAt: "2026-03-25T00:05:00.000Z",
  });

  await assert.rejects(
    publishVerifiedPrices({
      verificationRunId: 102,
      candidates: [
        createCandidate({
          cardPrintId: "cp-good",
          externalProductId: "product-good",
          externalVariantId: "variant-good",
        }),
        createCandidate({
          cardPrintId: "cp-fail",
          externalProductId: "product-fail",
          externalVariantId: "variant-fail",
          displayTitle: "Roronoa Zoro",
          displayImageUrl: "https://img.example/zoro.jpg",
        }),
      ],
      adapter,
      now: () => "2026-03-27T13:00:00.000Z",
    }),
    /display write failed/u,
  );

  assert.equal(adapter.state.runs.get(102)?.status, "failed");
  assert.equal(adapter.state.publishedPrices.get("cp-keep:justtcg")?.externalProductId, "product-keep");
  assert.equal(adapter.state.publishedDisplays.get("cp-keep")?.displayImageUrl, "https://img.example/keep.jpg");
  assert.equal(adapter.state.publishedPrices.has("cp-good:justtcg"), false);
  assert.equal(adapter.state.publishedDisplays.has("cp-good"), false);
});

test("publishPricingVerificationRun publishes verified and drift_warning rows and completes the run", async () => {
  const { publishPricingVerificationRun } =
    await importModule<typeof import("../lib/server/pricing/pricing-publisher")>(
      "lib/server/pricing/pricing-publisher.ts",
    );

  const adapter = createFakeAdapter();

  await publishPricingVerificationRun({
    verificationRunId: 77,
    candidates: [
      createCandidate(),
      createCandidate({
        cardPrintId: "cp-2",
        externalProductId: "product-2",
        externalVariantId: "variant-2",
        verificationStatus: "drift_warning",
        displayTitle: "Roronoa Zoro",
        displayImageUrl: "https://img.example/zoro.jpg",
      }),
    ],
    adapter,
    now: () => "2026-03-27T10:00:00.000Z",
  });

  assert.equal(adapter.state.publishedPrices.size, 2);
  assert.equal(adapter.state.publishedDisplays.size, 2);
  assert.deepEqual(adapter.state.runs.get(77), {
    status: "completed",
    finishedAt: "2026-03-27T10:00:00.000Z",
    notes: null,
  });
  assert.equal(adapter.state.publishedPrices.get("cp-2:justtcg")?.verificationStatus, "drift_warning");
  assert.deepEqual(adapter.state.operations.slice(-2), ["transaction:commit", "run:completed"]);
});

test("publishPricingVerificationRun skips non-raw-card candidates", async () => {
  const { publishPricingVerificationRun } =
    await importModule<typeof import("../lib/server/pricing/pricing-publisher")>(
      "lib/server/pricing/pricing-publisher.ts",
    );

  const adapter = createFakeAdapter();

  await publishPricingVerificationRun({
    verificationRunId: 771,
    candidates: [
      createCandidate(),
      createCandidate({
        cardPrintId: "cp-sealed",
        externalProductId: "product-sealed",
        externalVariantId: "variant-sealed",
        productKind: "sealed",
        displayTitle: "Premium Booster",
      }),
    ],
    adapter,
    now: () => "2026-03-27T10:05:00.000Z",
  });

  assert.equal(adapter.state.publishedPrices.size, 1);
  assert.equal(adapter.state.publishedDisplays.size, 1);
  assert.equal(adapter.state.publishedPrices.has("cp-sealed:justtcg"), false);
  assert.equal(adapter.state.publishedDisplays.has("cp-sealed"), false);
});

test("publishPricingVerificationRun leaves blocked rows untouched and records blocked conflicts", async () => {
  const { publishPricingVerificationRun } =
    await importModule<typeof import("../lib/server/pricing/pricing-publisher")>(
      "lib/server/pricing/pricing-publisher.ts",
    );

  const adapter = createFakeAdapter();
  adapter.state.publishedPrices.set("cp-1:justtcg", {
    cardPrintId: "cp-1",
    sourceId: "justtcg",
    externalProductId: "product-old",
    externalVariantId: "variant-old",
    priceMarket: 9.5,
    priceNm: 8.75,
    priceLp: 7.25,
    updatedAt: "2026-03-20T00:00:00.000Z",
    publishedAt: "2026-03-20T01:00:00.000Z",
    verificationStatus: "verified",
    verificationRunId: 12,
  });
  adapter.state.publishedDisplays.set("cp-1", {
    cardPrintId: "cp-1",
    externalProductId: "product-old",
    externalVariantId: "variant-old",
    displaySetName: "Romance Dawn",
    displaySetCode: "OP01",
    displayRarity: "SR",
    displayTitle: "Monkey D. Luffy",
    displayTreatmentLabel: "Treasure Rare",
    displayImageUrl: "https://img.example/old.jpg",
    labelStatus: "verified",
    verificationRunId: 12,
    publishedAt: "2026-03-20T01:00:00.000Z",
  });

  await publishPricingVerificationRun({
    verificationRunId: 78,
    candidates: [
      createCandidate({
        verificationStatus: "missing_tcgplayer_id",
      }),
      createCandidate({
        cardPrintId: "cp-2",
        externalProductId: "product-2",
        externalVariantId: "variant-2",
        verificationStatus: "mapping_conflict",
        conflictTypes: ["duplicate_product_assignment", "ui_label_mismatch"],
        displayTitle: "Wrong Label",
        displayImageUrl: "https://img.example/wrong.jpg",
      }),
    ],
    adapter,
    now: () => "2026-03-27T10:30:00.000Z",
  });

  assert.equal(adapter.state.publishedPrices.get("cp-1:justtcg")?.externalProductId, "product-old");
  assert.equal(adapter.state.publishedDisplays.get("cp-1")?.displayImageUrl, "https://img.example/old.jpg");
  assert.equal(adapter.state.publishedPrices.has("cp-2:justtcg"), false);
  assert.equal(adapter.state.publishedDisplays.has("cp-2"), false);
  assert.deepEqual(
    adapter.state.conflicts.map((entry) => entry.conflictType).sort(),
    ["duplicate_product_assignment", "ui_label_mismatch"],
  );
  assert.equal(adapter.state.runs.get(78)?.status, "completed");
  assert.deepEqual(adapter.state.operations.slice(-2), ["transaction:commit", "run:completed"]);
});

test("publishPricingVerificationRun rolls back published writes if the display write fails and marks the run failed", async () => {
  const { publishPricingVerificationRun } =
    await importModule<typeof import("../lib/server/pricing/pricing-publisher")>(
      "lib/server/pricing/pricing-publisher.ts",
    );

  const adapter = createFakeAdapter({ throwOnDisplay: true });

  await assert.rejects(
    publishPricingVerificationRun({
      verificationRunId: 79,
      candidates: [createCandidate()],
      adapter,
      now: () => "2026-03-27T11:00:00.000Z",
    }),
    /display write failed/u,
  );

  assert.equal(adapter.state.publishedPrices.size, 0);
  assert.equal(adapter.state.publishedDisplays.size, 0);
  assert.deepEqual(adapter.state.runs.get(79), {
    status: "failed",
    finishedAt: "2026-03-27T11:00:00.000Z",
    notes: "display write failed",
  });
  assert.equal(adapter.state.operations.includes("run:completed"), false);
});

test("bootstrapPublishedPricing seeds published price and display rows and is idempotent", async () => {
  const { bootstrapPublishedPricing } =
    await importModule<typeof import("../scripts/bootstrap-published-pricing.mjs")>(
      "scripts/bootstrap-published-pricing.mjs",
    );

  const adapter = createFakeAdapter();
  const candidates = [
    createCandidate({
      cardPrintId: "cp-boot-1",
    }),
    createCandidate({
      cardPrintId: "cp-boot-2",
      externalProductId: "product-2",
      externalVariantId: "variant-2",
      verificationStatus: "drift_warning",
      displayTitle: "Roronoa Zoro",
    }),
  ];

  const firstRun = await bootstrapPublishedPricing({
    candidates,
    adapter,
    now: () => "2026-03-27T12:00:00.000Z",
  });
  const secondRun = await bootstrapPublishedPricing({
    candidates,
    adapter,
    now: () => "2026-03-27T12:05:00.000Z",
  });

  assert.equal(firstRun.publishedPriceCount, 2);
  assert.equal(firstRun.publishedDisplayCount, 2);
  assert.equal(secondRun.publishedPriceCount, 2);
  assert.equal(secondRun.publishedDisplayCount, 2);
  assert.equal(adapter.state.publishedPrices.size, 2);
  assert.equal(adapter.state.publishedDisplays.size, 2);
});

test("bootstrapPublishedPricing loads candidates from the adapter when none are passed explicitly", async () => {
  const { bootstrapPublishedPricing } =
    await importModule<typeof import("../scripts/bootstrap-published-pricing.mjs")>(
      "scripts/bootstrap-published-pricing.mjs",
    );

  const adapter = {
    ...createFakeAdapter(),
    async loadBootstrapCandidates() {
      return [
        createCandidate({
          cardPrintId: "cp-auto-1",
        }),
        createCandidate({
          cardPrintId: "cp-auto-2",
          externalProductId: "product-auto-2",
          externalVariantId: "variant-auto-2",
          displayTitle: "Auto Loaded",
        }),
      ];
    },
  };

  const result = await bootstrapPublishedPricing({
    adapter,
    now: () => "2026-03-27T12:07:00.000Z",
  });

  assert.equal(result.coverage.liveCandidateIds.length, 2);
  assert.equal(adapter.state.publishedPrices.size, 2);
  assert.equal(adapter.state.publishedDisplays.size, 2);
});

test("postgres bootstrap adapter falls back to card print treatment labels when published display rows are blank", async () => {
  const { createPostgresBootstrapAdapter } =
    await importModule<typeof import("../scripts/bootstrap-published-pricing.mjs")>(
      "scripts/bootstrap-published-pricing.mjs",
    );

  const observedQueries: string[] = [];
  const adapter = await createPostgresBootstrapAdapter({
    begin: async (work: () => Promise<unknown>) => work(),
    unsafe: async (query: string) => {
      observedQueries.push(query);

      if (query.includes("from card_print_price_current current_prices")) {
        return [
          {
            cardPrintId: "OP13-119_p3",
            sourceId: "justtcg",
            externalProductId: "product-1",
            externalVariantId: "variant-1",
            priceMarket: 4420.37,
            priceNm: 4420.37,
            priceLp: 4200.0,
            updatedAt: "2026-03-29T00:00:00.000Z",
            officialName: "Monkey.D.Luffy",
            officialSetName: "Carrying On His Will",
            officialSetCode: "OP13",
            officialRarity: "SEC",
            displaySetName: "Carrying On His Will",
            displaySetCode: "OP13",
            displayRarity: "SEC",
            displayTitle: "Monkey.D.Luffy",
            displayTreatmentLabel: "Red Super Alternate Art",
            displayImageUrl: "https://img.example/luffy.jpg",
            labelStatus: "verified",
          },
        ];
      }

      return [];
    },
  } as never);

  const candidates = await adapter.loadBootstrapCandidates();

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.displayTreatmentLabel, "Red Super Alternate Art");
  assert.equal(candidates[0]?.labelStatus, "verified");

  const bootstrapQuery = observedQueries.find((query) => query.includes("from card_print_price_current current_prices"));
  assert.ok(bootstrapQuery, "expected bootstrap candidate query");
  assert.match(
    bootstrapQuery!,
    /coalesce\(display\.display_treatment_label,\s*nullif\(btrim\(cp\.variant_label\), ''\)\)\s+as "displayTreatmentLabel"/u,
  );
  assert.match(
    bootstrapQuery!,
    /case\s+when btrim\(coalesce\(cp\.variant_label,\s*''\)\) <> ''\s+and\s+\(\s*nullif\(btrim\(coalesce\(display\.display_treatment_label,\s*''\)\), ''\) is null\s+or\s+\(\s*display\.label_status = 'fallback'::pricing_label_status\s+and\s+nullif\(btrim\(coalesce\(display\.display_treatment_label,\s*''\)\), ''\) = nullif\(btrim\(cp\.variant_label\), ''\)\s*\)\s*\)\s+then\s+'verified'::pricing_label_status\s+else\s+coalesce\(display\.label_status,\s*'fallback'::pricing_label_status\)\s+end as "labelStatus"/u,
  );
});

test("postgres bootstrap adapter recomputes specific provider treatments when stored display labels are generic fallbacks", async () => {
  const { createPostgresBootstrapAdapter } =
    await importModule<typeof import("../scripts/bootstrap-published-pricing.mjs")>(
      "scripts/bootstrap-published-pricing.mjs",
    );

  const adapter = await createPostgresBootstrapAdapter({
    begin: async (work: () => Promise<unknown>) => work(),
    unsafe: async (query: string) => {
      if (query.includes("from card_print_price_current current_prices")) {
        return [
          {
            cardPrintId: "OP05-010_p2",
            sourceId: "justtcg",
            externalProductId: "product-nico-robin-full-art",
            externalVariantId: "variant-nico-robin-full-art",
            priceMarket: 30.72,
            priceNm: 30.72,
            priceLp: 25.11,
            updatedAt: "2026-03-31T00:00:00.000Z",
            officialName: "Nico Robin",
            officialSetName: "ONE PIECE CARD THE BEST [PRB-01]",
            officialSetCode: "PRB01",
            officialRarity: "UC",
            displaySetName: "ONE PIECE CARD THE BEST [PRB-01]",
            displaySetCode: "PRB01",
            displayRarity: "UC",
            displayTitle: "Nico Robin",
            displayTreatmentLabel: "Alternate Art",
            displayImageUrl: "https://img.example/nico-robin.jpg",
            labelStatus: "verified",
            cardPrintVariantLabel: "Alternate Art",
            cardPrintImageUrl: "https://img.example/nico-robin-card.jpg",
            providerProductName: "Nico Robin (Full Art)",
            providerProductUrlName: "nico-robin-full-art-op05-010",
            providerSetName: "Premium Booster -The Best-",
            providerTreatment: null,
            providerImageUrl: "https://img.example/nico-robin-provider.jpg",
          },
        ];
      }

      return [];
    },
  } as never);

  const candidates = await adapter.loadBootstrapCandidates();

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.displayTreatmentLabel, "Full Art");
  assert.equal(candidates[0]?.labelStatus, "verified");
  assert.equal(candidates[0]?.displayImageUrl, "https://img.example/nico-robin-provider.jpg");
});

test("postgres bootstrap adapter clears mirrored generic treatment chips when the provider product is a plain base printing", async () => {
  const { createPostgresBootstrapAdapter } =
    await importModule<typeof import("../scripts/bootstrap-published-pricing.mjs")>(
      "scripts/bootstrap-published-pricing.mjs",
    );

  const adapter = await createPostgresBootstrapAdapter({
    begin: async (work: () => Promise<unknown>) => work(),
    unsafe: async (query: string) => {
      if (query.includes("from card_print_price_current current_prices")) {
        return [
          {
            cardPrintId: "OP05-060_p3",
            sourceId: "justtcg",
            externalProductId: "product-st18-base",
            externalVariantId: "variant-st18-base",
            priceMarket: 0.3,
            priceNm: 0.3,
            priceLp: 0.12,
            updatedAt: "2026-03-31T00:00:00.000Z",
            officialName: "Monkey.D.Luffy",
            officialSetName: "Purple Monkey.D.Luffy [ST-18]",
            officialSetCode: "ST18",
            officialRarity: "L",
            displaySetName: "Purple Monkey.D.Luffy [ST-18]",
            displaySetCode: "ST18",
            displayRarity: "L",
            displayTitle: "Monkey.D.Luffy",
            displayTreatmentLabel: "Alternate Art",
            displayImageUrl: "https://img.example/luffy-card.jpg",
            labelStatus: "verified",
            cardPrintVariantLabel: "Alternate Art",
            cardPrintImageUrl: "https://img.example/luffy-card.jpg",
            providerProductName: "Monkey.D.Luffy (OP05-060)",
            providerProductUrlName: "monkey-d-luffy-op05-060-st18",
            providerSetName: "Purple Monkey.D.Luffy [ST-18]",
            providerTreatment: null,
            providerImageUrl: "https://img.example/luffy-provider.jpg",
          },
        ];
      }

      return [];
    },
  } as never);

  const candidates = await adapter.loadBootstrapCandidates();

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.displayTreatmentLabel, null);
  assert.equal(candidates[0]?.labelStatus, "verified");
  assert.equal(candidates[0]?.displayImageUrl, "https://img.example/luffy-provider.jpg");
});

test("bootstrapPublishedPricing skips blocked or incomplete non-live candidates without blanking existing published rows", async () => {
  const { bootstrapPublishedPricing } =
    await importModule<typeof import("../scripts/bootstrap-published-pricing.mjs")>(
      "scripts/bootstrap-published-pricing.mjs",
    );

  const adapter = createFakeAdapter();
  adapter.state.publishedPrices.set("cp-keep:justtcg", {
    cardPrintId: "cp-keep",
    sourceId: "justtcg",
    externalProductId: "product-keep",
    externalVariantId: "variant-keep",
    priceMarket: 7.2,
    priceNm: 6.9,
    priceLp: 5.75,
    updatedAt: "2026-03-20T00:00:00.000Z",
    publishedAt: "2026-03-20T00:05:00.000Z",
    verificationStatus: "verified",
    verificationRunId: 11,
  });
  adapter.state.publishedDisplays.set("cp-keep", {
    cardPrintId: "cp-keep",
    externalProductId: "product-keep",
    externalVariantId: "variant-keep",
    displaySetName: "Romance Dawn",
    displaySetCode: "OP01",
    displayRarity: "SR",
    displayTitle: "Keep Me",
    displayTreatmentLabel: null,
    displayImageUrl: "https://img.example/keep.jpg",
    labelStatus: "verified",
    verificationRunId: 11,
    publishedAt: "2026-03-20T00:05:00.000Z",
  });

  const result = await bootstrapPublishedPricing({
    candidates: [
      createCandidate({
        cardPrintId: "cp-safe",
      }),
      createCandidate({
        cardPrintId: "cp-blocked",
        verificationStatus: "mapping_conflict",
        conflictTypes: ["duplicate_product_assignment"],
        currentCandidatePriced: false,
      }),
      createCandidate({
        cardPrintId: "cp-incomplete",
        externalVariantId: null,
        currentCandidatePriced: false,
      }),
    ],
    adapter,
    now: () => "2026-03-27T12:10:00.000Z",
  });

  assert.equal(result.publishedPriceCount, 1);
  assert.equal(result.publishedDisplayCount, 1);
  assert.equal(adapter.state.publishedPrices.get("cp-keep:justtcg")?.externalProductId, "product-keep");
  assert.equal(adapter.state.publishedDisplays.get("cp-keep")?.displayImageUrl, "https://img.example/keep.jpg");
});

test("bootstrapPublishedPricing fails loudly when live candidate-priced rows still lack published coverage after seeding", async () => {
  const { bootstrapPublishedPricing } =
    await importModule<typeof import("../scripts/bootstrap-published-pricing.mjs")>(
      "scripts/bootstrap-published-pricing.mjs",
    );

  const adapter = createFakeAdapter();

  await assert.rejects(
    bootstrapPublishedPricing({
      candidates: [
        createCandidate({
          cardPrintId: "cp-gap",
          verificationStatus: "missing_tcgplayer_id",
        }),
      ],
      adapter,
      now: () => "2026-03-27T12:15:00.000Z",
    }),
    /published coverage gap/u,
  );

  const latestRun = Math.max(...adapter.state.runs.keys());
  assert.equal(adapter.state.runs.get(latestRun)?.status, "failed");
});

test("publishPricingVerificationRun blocks price publishes when a candidate cannot produce a synced display row", async () => {
  const { publishPricingVerificationRun } =
    await importModule<typeof import("../lib/server/pricing/pricing-publisher")>(
      "lib/server/pricing/pricing-publisher.ts",
    );

  const adapter = createFakeAdapter();

  await publishPricingVerificationRun({
    verificationRunId: 90,
    candidates: [
      createCandidate({
        cardPrintId: "cp-no-display",
        displayTitle: null,
        displaySetName: null,
        displaySetCode: null,
        officialName: null,
        officialSetName: null,
        officialSetCode: null,
      }),
    ],
    adapter,
    now: () => "2026-03-27T12:30:00.000Z",
  });

  assert.equal(adapter.state.publishedPrices.has("cp-no-display:justtcg"), false);
  assert.equal(adapter.state.publishedDisplays.has("cp-no-display"), false);
});

test("publishPricingVerificationRun preserves the original publish failure when marking the run failed also errors", async () => {
  const { publishPricingVerificationRun } =
    await importModule<typeof import("../lib/server/pricing/pricing-publisher")>(
      "lib/server/pricing/pricing-publisher.ts",
    );

  const adapter = createFakeAdapter({ throwOnDisplay: true });
  adapter.markRunFailed = async () => {
    throw new Error("run failure update failed");
  };

  await assert.rejects(
    publishPricingVerificationRun({
      verificationRunId: 91,
      candidates: [createCandidate()],
      adapter,
      now: () => "2026-03-27T12:35:00.000Z",
    }),
    /display write failed/u,
  );
});

test("publishVerifiedPricingRun loads the verification run candidates and keeps blocked live rows untouched", async () => {
  const { publishVerifiedPricingRun } =
    await importModule<typeof import("../scripts/publish-verified-prices.mjs")>(
      "scripts/publish-verified-prices.mjs",
    );

  const adapter = createFakeAdapter();
  adapter.state.publishedPrices.set("cp-blocked:justtcg", {
    cardPrintId: "cp-blocked",
    sourceId: "justtcg",
    externalProductId: "product-old",
    externalVariantId: "variant-old",
    priceMarket: 700,
    priceNm: 700,
    priceLp: 650,
    updatedAt: "2026-03-20T00:00:00.000Z",
    publishedAt: "2026-03-20T00:05:00.000Z",
    verificationStatus: "verified",
    verificationRunId: 12,
  });
  adapter.state.publishedDisplays.set("cp-blocked", {
    cardPrintId: "cp-blocked",
    externalProductId: "product-old",
    externalVariantId: "variant-old",
    displaySetName: "Romance Dawn",
    displaySetCode: "OP01",
    displayRarity: "SR",
    displayTitle: "Keep Existing",
    displayTreatmentLabel: "Treasure Rare",
    displayImageUrl: "https://img.example/keep.jpg",
    labelStatus: "verified",
    verificationRunId: 12,
    publishedAt: "2026-03-20T00:05:00.000Z",
  });

  await publishVerifiedPricingRun({
    verificationRunId: 120,
    adapter: {
      ...adapter,
      async loadPublishCandidates(verificationRunId: number) {
        assert.equal(verificationRunId, 120);
        return [
          createCandidate({
            cardPrintId: "cp-safe",
            externalProductId: "product-safe",
            externalVariantId: "variant-safe",
            verificationStatus: "verified",
            displayTitle: "Monkey D. Luffy",
          }),
          createCandidate({
            cardPrintId: "cp-blocked",
            externalProductId: "product-blocked",
            externalVariantId: "variant-blocked",
            verificationStatus: "mapping_conflict",
            conflictTypes: ["duplicate_product_assignment"],
            displayTitle: "Wrong Label",
          }),
        ];
      },
    },
    now: () => "2026-03-27T13:00:00.000Z",
  });

  assert.equal(adapter.state.publishedPrices.get("cp-safe:justtcg")?.externalProductId, "product-safe");
  assert.equal(adapter.state.publishedPrices.get("cp-blocked:justtcg")?.externalProductId, "product-old");
  assert.equal(adapter.state.publishedDisplays.get("cp-blocked")?.displayTitle, "Keep Existing");
  assert.equal(adapter.state.runs.get(120)?.status, "completed");
});

test("publishVerifiedPricingRun uses verification-snapshot values instead of newer candidate price fields", async () => {
  const { publishVerifiedPricingRun } =
    await importModule<typeof import("../scripts/publish-verified-prices.mjs")>(
      "scripts/publish-verified-prices.mjs",
    );

  const adapter = createFakeAdapter();

  await publishVerifiedPricingRun({
    verificationRunId: 130,
    adapter: {
      ...adapter,
      async loadPublishCandidates() {
        return [
          {
            verificationStatus: "verified",
            productKind: "raw_card",
            labelIntegrityStatus: "verified",
            justtcgPriceNm: 12.5,
            priceMarket: 88.88,
            priceLp: 77.77,
            providerUpdatedAt: "2026-03-28T00:00:00.000Z",
            updatedAt: "2026-03-28T00:00:00.000Z",
            verifiedCheckedAt: "2026-03-27T12:00:00.000Z",
            conflictTypes: [],
            cardPrint: {
              id: "cp-snapshot",
              setCode: "OP01",
              setName: "Romance Dawn",
              title: "Monkey D. Luffy",
              rarity: "SR",
              treatmentLabel: null,
              imageUrl: null,
            },
            provider: {
              externalProductId: "product-snapshot",
              externalVariantId: "variant-snapshot",
              productName: "Monkey D. Luffy OP01-001",
              productUrlName: "monkey-d-luffy-op01-001",
              setName: "Romance Dawn",
              number: "OP01-001",
              treatment: null,
              imageUrl: null,
            },
            publishedDisplay: null,
          },
        ];
      },
    },
    now: () => "2026-03-27T13:05:00.000Z",
  });

  assert.equal(adapter.state.publishedPrices.get("cp-snapshot:justtcg")?.priceMarket, 12.5);
  assert.equal(adapter.state.publishedPrices.get("cp-snapshot:justtcg")?.priceLp, null);
  assert.equal(adapter.state.publishedPrices.get("cp-snapshot:justtcg")?.updatedAt, "2026-03-27T12:00:00.000Z");
});

test("publishVerifiedPricingRun completes an empty verification run instead of leaving it stuck", async () => {
  const { publishVerifiedPricingRun } =
    await importModule<typeof import("../scripts/publish-verified-prices.mjs")>(
      "scripts/publish-verified-prices.mjs",
    );

  const adapter = createFakeAdapter();
  adapter.state.runs.set(140, {
    status: "running",
    finishedAt: null,
    notes: null,
  });

  const result = await publishVerifiedPricingRun({
    verificationRunId: 140,
    adapter: {
      ...adapter,
      async loadPublishCandidates() {
        return [];
      },
    },
    now: () => "2026-03-27T13:10:00.000Z",
  });

  assert.equal(result.publishedCount, 0);
  assert.equal(adapter.state.runs.get(140)?.status, "completed");
});
