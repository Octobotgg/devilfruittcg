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

type Candidate = {
  cardPrintId: string;
  sourceId: string;
  externalProductId: string | null;
  externalVariantId: string | null;
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

function createCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    cardPrintId: "cp-1",
    sourceId: "justtcg",
    externalProductId: "product-1",
    externalVariantId: "variant-1",
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

function createFakeAdapter(options?: { throwOnDisplay?: boolean }) {
  const state = {
    publishedPrices: new Map<string, PublishedPriceRow>(),
    publishedDisplays: new Map<string, PublishedDisplayRow>(),
    runs: new Map<number, { status: string; finishedAt: string | null; notes: string | null }>(),
    conflicts: [] as Array<{ verificationRunId: number; cardPrintId: string; conflictType: string }>,
    operations: [] as string[],
    nextRunId: 100,
  };

  const snapshot = () => ({
    publishedPrices: new Map(state.publishedPrices),
    publishedDisplays: new Map(state.publishedDisplays),
    runs: new Map(
      Array.from(state.runs.entries(), ([key, value]) => [key, { ...value }]),
    ),
    conflicts: state.conflicts.map((entry) => ({ ...entry })),
    operations: [...state.operations],
  });

  const restore = (value: ReturnType<typeof snapshot>) => {
    state.publishedPrices = value.publishedPrices;
    state.publishedDisplays = value.publishedDisplays;
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
    },
    async markRunFailed(verificationRunId: number, finishedAt: string, notes: string | null) {
      state.operations.push("run:failed");
      state.runs.set(verificationRunId, {
        status: "failed",
        finishedAt,
        notes,
      });
    },
    async createVerificationRun(source: string, notes: string | null, startedAt: string) {
      const runId = state.nextRunId;
      state.nextRunId += 1;
      state.operations.push("run:created");
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
