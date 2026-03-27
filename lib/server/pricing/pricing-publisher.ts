import { createRequire } from "node:module";
import type { Sql } from "postgres";

import {
  buildPublishedDisplayUpsert,
  candidateCanPublish,
  type PricingPublishCandidate,
  type PricingVerificationStatus,
  type PublishedDisplayUpsert,
} from "./display-label-publisher.ts";

const require = createRequire(import.meta.url);
if (process.env.NODE_ENV !== "test") {
  require("server-only");
}
const { createPostgresClient }: typeof import("../../../db/postgres") = require("../../../db/postgres.ts");

export type PublishedPriceUpsert = {
  cardPrintId: string;
  sourceId: string;
  externalProductId: string;
  externalVariantId: string;
  priceMarket: number | null;
  priceNm: number;
  priceLp: number | null;
  updatedAt: string;
  publishedAt: string;
  verificationStatus: PricingVerificationStatus;
  verificationRunId: number;
};

export type PricingPublisherAdapter = {
  transaction<T>(work: () => Promise<T>): Promise<T>;
  upsertPublishedPrices(rows: PublishedPriceUpsert[]): Promise<void>;
  upsertPublishedDisplays(rows: PublishedDisplayUpsert[]): Promise<void>;
  recordConflicts(
    verificationRunId: number,
    conflicts: Array<{ cardPrintId: string; conflictType: string }>,
  ): Promise<void>;
  markRunCompleted(verificationRunId: number, finishedAt: string): Promise<void>;
  markRunFailed(verificationRunId: number, finishedAt: string, notes: string | null): Promise<void>;
};

function buildInsertValues<T extends Record<string, unknown>>(
  rows: T[],
  columns: Array<keyof T>,
  startingIndex = 1,
) {
  const params: unknown[] = [];
  const values = rows.map((row, rowIndex) => {
    const placeholders = columns.map((column, columnIndex) => {
      params.push(row[column]);
      return `$${startingIndex + rowIndex * columns.length + columnIndex}`;
    });
    return `(${placeholders.join(", ")})`;
  });

  return {
    params,
    sql: values.join(", "),
  };
}

function buildPublishedPriceUpsert(
  candidate: PricingPublishCandidate,
  options: {
    verificationRunId: number;
    publishedAt: string;
  },
): PublishedPriceUpsert | null {
  if (!candidateCanPublish(candidate)) return null;

  return {
    cardPrintId: candidate.cardPrintId,
    sourceId: candidate.sourceId,
    externalProductId: String(candidate.externalProductId),
    externalVariantId: String(candidate.externalVariantId),
    priceMarket: candidate.priceMarket,
    priceNm: Number(candidate.priceNm),
    priceLp: candidate.priceLp,
    updatedAt: String(candidate.updatedAt),
    publishedAt: options.publishedAt,
    verificationStatus: candidate.verificationStatus,
    verificationRunId: options.verificationRunId,
  };
}

function collectConflictRows(candidates: PricingPublishCandidate[]) {
  return candidates.flatMap((candidate) =>
    (candidate.conflictTypes || []).map((conflictType) => ({
      cardPrintId: candidate.cardPrintId,
      conflictType,
    })),
  );
}

export async function publishPricingVerificationRun(options: {
  verificationRunId: number;
  candidates: PricingPublishCandidate[];
  adapter?: PricingPublisherAdapter;
  now?: () => string;
}) {
  const adapter = options.adapter ?? createPostgresPricingPublisherAdapter();
  const publishedAt = options.now ? options.now() : new Date().toISOString();
  const priceRows = options.candidates
    .map((candidate) =>
      buildPublishedPriceUpsert(candidate, {
        verificationRunId: options.verificationRunId,
        publishedAt,
      }),
    )
    .filter((row): row is PublishedPriceUpsert => Boolean(row));
  const displayRows = options.candidates
    .map((candidate) =>
      buildPublishedDisplayUpsert(candidate, {
        verificationRunId: options.verificationRunId,
        publishedAt,
      }),
    )
    .filter((row): row is PublishedDisplayUpsert => Boolean(row));
  const conflicts = collectConflictRows(options.candidates);

  try {
    await adapter.transaction(async () => {
      if (conflicts.length) {
        await adapter.recordConflicts(options.verificationRunId, conflicts);
      }
      if (priceRows.length) {
        await adapter.upsertPublishedPrices(priceRows);
      }
      if (displayRows.length) {
        await adapter.upsertPublishedDisplays(displayRows);
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await adapter.markRunFailed(options.verificationRunId, publishedAt, message);
    throw error;
  }

  await adapter.markRunCompleted(options.verificationRunId, publishedAt);
}

export function createPostgresPricingPublisherAdapter(sql: Sql = createPostgresClient()): PricingPublisherAdapter {
  return {
    async transaction<T>(work: () => Promise<T>) {
      return sql.begin(async () => work()) as Promise<T>;
    },
    async upsertPublishedPrices(rows: PublishedPriceUpsert[]) {
      if (!rows.length) return;

      const columns: Array<keyof PublishedPriceUpsert> = [
        "cardPrintId",
        "sourceId",
        "externalProductId",
        "externalVariantId",
        "priceMarket",
        "priceNm",
        "priceLp",
        "updatedAt",
        "publishedAt",
        "verificationStatus",
        "verificationRunId",
      ];
      const { sql: valuesSql, params } = buildInsertValues(rows, columns);
      await sql.unsafe(
        `
          insert into card_print_price_published
            (card_print_id, source_id, external_product_id, external_variant_id, price_market, price_nm, price_lp, updated_at, published_at, verification_status, verification_run_id)
          values ${valuesSql}
          on conflict (card_print_id, source_id) do update
          set
            external_product_id = excluded.external_product_id,
            external_variant_id = excluded.external_variant_id,
            price_market = excluded.price_market,
            price_nm = excluded.price_nm,
            price_lp = excluded.price_lp,
            updated_at = excluded.updated_at,
            published_at = excluded.published_at,
            verification_status = excluded.verification_status,
            verification_run_id = excluded.verification_run_id
        `,
        params as never[],
      );
    },
    async upsertPublishedDisplays(rows: PublishedDisplayUpsert[]) {
      if (!rows.length) return;

      const columns: Array<keyof PublishedDisplayUpsert> = [
        "cardPrintId",
        "externalProductId",
        "externalVariantId",
        "displaySetName",
        "displaySetCode",
        "displayRarity",
        "displayTitle",
        "displayTreatmentLabel",
        "displayImageUrl",
        "labelStatus",
        "verificationRunId",
        "publishedAt",
      ];
      const { sql: valuesSql, params } = buildInsertValues(rows, columns);
      await sql.unsafe(
        `
          insert into card_print_display_published
            (card_print_id, external_product_id, external_variant_id, display_set_name, display_set_code, display_rarity, display_title, display_treatment_label, display_image_url, label_status, verification_run_id, published_at)
          values ${valuesSql}
          on conflict (card_print_id) do update
          set
            external_product_id = excluded.external_product_id,
            external_variant_id = excluded.external_variant_id,
            display_set_name = excluded.display_set_name,
            display_set_code = excluded.display_set_code,
            display_rarity = excluded.display_rarity,
            display_title = excluded.display_title,
            display_treatment_label = excluded.display_treatment_label,
            display_image_url = excluded.display_image_url,
            label_status = excluded.label_status,
            verification_run_id = excluded.verification_run_id,
            published_at = excluded.published_at
        `,
        params as never[],
      );
    },
    async recordConflicts(verificationRunId: number, conflicts: Array<{ cardPrintId: string; conflictType: string }>) {
      if (!conflicts.length) return;
      const rows = conflicts.map((conflict) => ({
        verificationRunId,
        cardPrintId: conflict.cardPrintId,
        conflictType: conflict.conflictType,
      }));
      const columns: Array<"verificationRunId" | "cardPrintId" | "conflictType"> = [
        "verificationRunId",
        "cardPrintId",
        "conflictType",
      ];
      const { sql: valuesSql, params } = buildInsertValues(rows, columns);
      await sql.unsafe(
        `
          insert into pricing_mapping_conflicts
            (verification_run_id, card_print_id, conflict_type)
          values ${valuesSql}
        `,
        params as never[],
      );
    },
    async markRunCompleted(verificationRunId: number, finishedAt: string) {
      await sql.unsafe(
        `
          update pricing_verification_runs
          set status = 'completed',
              finished_at = $2::timestamptz
          where id = $1
        `,
        [verificationRunId, finishedAt],
      );
    },
    async markRunFailed(verificationRunId: number, finishedAt: string, notes: string | null) {
      await sql.unsafe(
        `
          update pricing_verification_runs
          set status = 'failed',
              finished_at = $2::timestamptz,
              notes = coalesce($3, notes)
          where id = $1
        `,
        [verificationRunId, finishedAt, notes],
      );
    },
  };
}
