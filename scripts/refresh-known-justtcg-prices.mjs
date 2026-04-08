#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

import { bootstrapPublishedPricing, createPostgresBootstrapAdapter } from "./bootstrap-published-pricing.mjs";
import { buildVariantBackfilledCurrentPriceRows } from "./import-justtcg-to-drizzle.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const JUSTTCG_SOURCE_ID = "justtcg";

function parseArgs(argv) {
  const args = {
    releaseName: "",
    cardPrintIds: [],
    allKnown: false,
    source: "justtcg_known_price_refresh",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--release-name") {
      args.releaseName = String(argv[index + 1] || "").trim();
      index += 1;
      continue;
    }
    if (token === "--card-print-id") {
      args.cardPrintIds = String(argv[index + 1] || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      index += 1;
      continue;
    }
    if (token === "--all-known") {
      args.allKnown = true;
      continue;
    }
    if (token === "--source") {
      args.source = String(argv[index + 1] || "").trim() || args.source;
      index += 1;
    }
  }

  return args;
}

function getConnectionString() {
  const value = String(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || "").trim();
  if (!value) {
    throw new Error("Missing SUPABASE_DB_URL or DATABASE_URL for known price refresh");
  }
  return value;
}

function buildActiveAssignmentQuery({ releaseName, cardPrintIds }) {
  const conditions = [
    "cp.active_external_product_id is not null",
    "cp.active_external_variant_id is not null",
  ];
  const values = [];

  if (releaseName) {
    values.push(releaseName);
    conditions.push(`r.name = $${values.length}`);
  }

  if (Array.isArray(cardPrintIds) && cardPrintIds.length) {
    values.push(cardPrintIds);
    conditions.push(`cp.id = any($${values.length}::text[])`);
  }

  return {
    text: `
      select
        cp.id as card_print_id,
        cp.active_external_product_id,
        cp.active_external_variant_id,
        cp.variant_slug,
        cp.variant_label
      from card_prints cp
      left join releases r on r.id = cp.release_id
      where ${conditions.join("\n        and ")}
      order by cp.id
    `,
    values,
  };
}

async function loadActiveAssignments(sql, options) {
  const query = buildActiveAssignmentQuery(options);
  return sql.unsafe(query.text, query.values);
}

async function upsertCurrentPrices(sql, rows) {
  for (const row of rows) {
    await sql`
      insert into card_print_price_current (
        card_print_id,
        source_id,
        external_product_id,
        external_variant_id,
        price_market,
        price_nm,
        price_lp,
        price_change_24h,
        price_change_7d,
        price_change_30d,
        updated_at,
        fetched_at
      ) values (
        ${row.card_print_id},
        ${row.source_id},
        ${row.external_product_id},
        ${row.external_variant_id},
        ${row.price_market},
        ${row.price_nm},
        ${row.price_lp},
        ${row.price_change_24h},
        ${row.price_change_7d},
        ${row.price_change_30d},
        ${row.updated_at},
        ${row.fetched_at}
      )
      on conflict (card_print_id, source_id)
      do update set
        external_product_id = excluded.external_product_id,
        external_variant_id = excluded.external_variant_id,
        price_market = excluded.price_market,
        price_nm = excluded.price_nm,
        price_lp = excluded.price_lp,
        price_change_24h = excluded.price_change_24h,
        price_change_7d = excluded.price_change_7d,
        price_change_30d = excluded.price_change_30d,
        updated_at = excluded.updated_at,
        fetched_at = excluded.fetched_at
    `;
  }
}

export async function runKnownMappedPriceRefresh({
  releaseName = "",
  cardPrintIds = [],
  allKnown = false,
  source = "justtcg_known_price_refresh",
  sqlClient = null,
} = {}) {
  if (!allKnown && !releaseName && (!Array.isArray(cardPrintIds) || !cardPrintIds.length)) {
    throw new Error("runKnownMappedPriceRefresh requires --all-known, --release-name, or --card-print-id");
  }

  const sql =
    sqlClient ||
    postgres(getConnectionString(), {
      prepare: false,
    });
  const ownsClient = !sqlClient;

  try {
    const activeAssignments = await loadActiveAssignments(sql, {
      releaseName: allKnown ? "" : releaseName,
      cardPrintIds: allKnown ? [] : cardPrintIds,
    });
    const productIds = [...new Set(activeAssignments.map((row) => row.active_external_product_id).filter(Boolean))];

    const [externalProducts, externalProductVariants] = await Promise.all([
      productIds.length
        ? sql`
            select
              id,
              source_id,
              external_product_id,
              name,
              set_name,
              number,
              raw_payload,
              last_seen_at,
              created_at,
              updated_at
            from external_products
            where id = any(${productIds})
          `
        : [],
      productIds.length
        ? sql`
            select
              id,
              external_product_id,
              source_id,
              provider_variant_id,
              condition,
              printing,
              language,
              price,
              last_updated_at,
              price_history_payload,
              raw_payload,
              created_at,
              updated_at
            from external_product_variants
            where external_product_id = any(${productIds})
          `
        : [],
    ]);

    const rows = buildVariantBackfilledCurrentPriceRows({
      activeAssignments,
      externalProducts,
      externalProductVariants,
    });

    if (!rows.length) {
      return {
        releaseName: releaseName || null,
        targetCardPrintCount: Array.isArray(cardPrintIds) ? cardPrintIds.length : 0,
        refreshedCount: 0,
        publishedPriceCount: 0,
        publishedDisplayCount: 0,
        verificationRunId: null,
      };
    }

    await upsertCurrentPrices(sql, rows);

    const adapter = await createPostgresBootstrapAdapter(sql);
    const targetIds = new Set(rows.map((row) => row.card_print_id));
    const allCandidates = await adapter.loadBootstrapCandidates();
    const candidates = allCandidates.filter((candidate) => targetIds.has(candidate.cardPrintId));
    const publishResult = await bootstrapPublishedPricing({
      adapter,
      candidates,
      source,
    });

    return {
      releaseName: releaseName || null,
      targetCardPrintCount: Array.isArray(cardPrintIds) && cardPrintIds.length ? cardPrintIds.length : targetIds.size,
      refreshedCount: rows.length,
      publishedPriceCount: publishResult.publishedPriceCount,
      publishedDisplayCount: publishResult.publishedDisplayCount,
      verificationRunId: publishResult.verificationRunId,
    };
  } finally {
    if (ownsClient) {
      await sql.end({ timeout: 5 });
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const summary = await runKnownMappedPriceRefresh(args);
  console.log(JSON.stringify(summary, null, 2));
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  });
}
