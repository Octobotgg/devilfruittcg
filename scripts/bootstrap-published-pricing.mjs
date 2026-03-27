#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const JUSTTCG_SOURCE_ID = "justtcg";

async function loadPricingPublisherModule() {
  return import(pathToFileURL(path.join(ROOT, "lib/server/pricing/pricing-publisher.ts")).href);
}

function normalizeCandidateIds(candidates) {
  return Array.from(
    new Set(
      candidates
        .filter((candidate) => candidate.currentCandidatePriced !== false)
        .map((candidate) => String(candidate.cardPrintId || "").trim())
        .filter(Boolean),
    ),
  );
}

export function reconcilePublishedCoverage({
  candidates,
  publishedPriceCardPrintIds,
  publishedDisplayCardPrintIds,
}) {
  const liveCandidateIds = normalizeCandidateIds(candidates);
  const missingPriceCoverage = liveCandidateIds.filter((cardPrintId) => !publishedPriceCardPrintIds.has(cardPrintId));
  const missingDisplayCoverage = liveCandidateIds.filter((cardPrintId) => !publishedDisplayCardPrintIds.has(cardPrintId));

  return {
    liveCandidateIds,
    missingPriceCoverage,
    missingDisplayCoverage,
    ok: missingPriceCoverage.length === 0 && missingDisplayCoverage.length === 0,
  };
}

function coverageErrorMessage(coverage) {
  const parts = [];
  if (coverage.missingPriceCoverage.length) {
    parts.push(`missing price coverage for ${coverage.missingPriceCoverage.join(", ")}`);
  }
  if (coverage.missingDisplayCoverage.length) {
    parts.push(`missing display coverage for ${coverage.missingDisplayCoverage.join(", ")}`);
  }
  return `published coverage gap: ${parts.join("; ")}`;
}

export async function bootstrapPublishedPricing(options) {
  const now = options?.now ?? (() => new Date().toISOString());
  const startedAt = now();
  const source = options?.source ?? "bootstrap-published-pricing";
  const candidates = Array.isArray(options?.candidates) ? options.candidates : [];
  const adapter = options?.adapter;

  if (!adapter) {
    throw new Error("bootstrapPublishedPricing requires an adapter");
  }

  const verificationRunId =
    options?.verificationRunId ?? (await adapter.createVerificationRun(source, null, startedAt));
  const { publishPricingVerificationRun } = await loadPricingPublisherModule();

  await publishPricingVerificationRun({
    verificationRunId,
    candidates,
    adapter,
    now,
  });

  const liveCandidateIds = normalizeCandidateIds(candidates);
  const coverageSnapshot = await adapter.listPublishedCoverage(liveCandidateIds);
  const coverage = reconcilePublishedCoverage({
    candidates,
    publishedPriceCardPrintIds: coverageSnapshot.priceCardPrintIds,
    publishedDisplayCardPrintIds: coverageSnapshot.displayCardPrintIds,
  });

  if (!coverage.ok) {
    const finishedAt = now();
    const message = coverageErrorMessage(coverage);
    await adapter.markRunFailed(verificationRunId, finishedAt, message);
    throw new Error(message);
  }

  return {
    verificationRunId,
    publishedPriceCount: coverageSnapshot.priceCardPrintIds.size,
    publishedDisplayCount: coverageSnapshot.displayCardPrintIds.size,
    coverage,
  };
}

export async function createPostgresBootstrapAdapter(sql) {
  const [{ createPostgresPricingPublisherAdapter }, postgresModule] = await Promise.all([
    loadPricingPublisherModule(),
    import(pathToFileURL(path.join(ROOT, "db/postgres.ts")).href),
  ]);
  const postgresClient = sql ?? postgresModule.createPostgresClient();
  const publisherAdapter = createPostgresPricingPublisherAdapter(postgresClient);

  return {
    ...publisherAdapter,
    async createVerificationRun(source, notes, startedAt) {
      const rows = await postgresClient.unsafe(
        `
          insert into pricing_verification_runs (status, started_at, source, notes)
          values ('running', $1::timestamptz, $2, $3)
          returning id
        `,
        [startedAt, source, notes],
      );
      return Number(rows[0]?.id);
    },
    async listPublishedCoverage(cardPrintIds) {
      const ids = Array.from(new Set(cardPrintIds.map((value) => String(value || "").trim()).filter(Boolean)));
      if (!ids.length) {
        return {
          priceCardPrintIds: new Set(),
          displayCardPrintIds: new Set(),
        };
      }

      const [priceRows, displayRows] = await Promise.all([
        postgresClient.unsafe(
          `
            select card_print_id as "cardPrintId"
            from card_print_price_published
            where source_id = $2
              and card_print_id = any($1::text[])
          `,
          [ids, JUSTTCG_SOURCE_ID],
        ),
        postgresClient.unsafe(
          `
            select card_print_id as "cardPrintId"
            from card_print_display_published
            where card_print_id = any($1::text[])
          `,
          [ids],
        ),
      ]);

      return {
        priceCardPrintIds: new Set(priceRows.map((row) => String(row.cardPrintId))),
        displayCardPrintIds: new Set(displayRows.map((row) => String(row.cardPrintId))),
      };
    },
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const adapter = await createPostgresBootstrapAdapter();
  await bootstrapPublishedPricing({
    candidates: [],
    adapter,
  });
}
