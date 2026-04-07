import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import postgres from "postgres";

const DEFAULT_OUT_DIR = path.join(process.cwd(), ".cache", "justtcg");
const DEFAULT_BATCH_SIZE = 500;

function getConnectionString() {
  const raw = String(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || "").trim();
  if (!raw) {
    throw new Error("Missing DATABASE_URL or SUPABASE_DB_URL");
  }
  return raw;
}

function parseArgs(argv) {
  const args = {
    outDir: DEFAULT_OUT_DIR,
    batchSize: DEFAULT_BATCH_SIZE,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--out-dir") {
      args.outDir = path.resolve(process.cwd(), String(argv[index + 1] || args.outDir));
      index += 1;
      continue;
    }
    if (token === "--batch-size") {
      args.batchSize = Math.max(1, Number(argv[index + 1] || args.batchSize));
      index += 1;
    }
  }

  return args;
}

async function fetchAll(sql, queryFactory, batchSize) {
  const rows = [];
  let offset = 0;

  for (;;) {
    const batch = await queryFactory(batchSize, offset);
    rows.push(...batch);
    if (batch.length < batchSize) break;
    offset += batchSize;
  }

  return rows;
}

function normalizeConfidence(value) {
  if (typeof value === "number") return value;
  switch (String(value || "").toLowerCase()) {
    case "high":
      return 0.99;
    case "medium":
      return 0.9;
    case "low":
      return 0.75;
    default:
      return value || null;
  }
}

function parseJsonObject(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

export function filterExportableLegacyRows({ maps, prices }) {
  const exportableMaps = (Array.isArray(maps) ? maps : []).filter((row) =>
    String(row?.resolved_card_print_id || "").trim(),
  );
  const exportableCardIds = new Set(exportableMaps.map((row) => String(row.devilfruit_id || "").trim()).filter(Boolean));
  const exportablePrices = (Array.isArray(prices) ? prices : []).filter((row) =>
    exportableCardIds.has(String(row?.devilfruit_id || "").trim()),
  );

  return {
    maps: exportableMaps,
    prices: exportablePrices,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sql = postgres(getConnectionString(), {
    prepare: false,
    max: 1,
  });

  try {
    const [maps, prices] = await Promise.all([
      fetchAll(
        sql,
        (limit, offset) =>
          sql`
            select
              justtcg_card_map.*,
              card_prints.id as resolved_card_print_id,
              card_prints.variant_label as card_print_variant_label,
              card_prints.variant_slug as card_print_variant_slug,
              card_prints.metadata as card_print_metadata
            from justtcg_card_map
            left join card_prints on card_prints.id = justtcg_card_map.devilfruit_id
            where status in ('auto_approved', 'manually_approved')
            order by justtcg_card_map.devilfruit_id asc
            limit ${limit} offset ${offset}
          `,
        args.batchSize,
      ),
      fetchAll(
        sql,
        (limit, offset) =>
          sql`
            select *
            from justtcg_prices
            order by devilfruit_id asc
            limit ${limit} offset ${offset}
          `,
        args.batchSize,
      ),
    ]);
    const filtered = filterExportableLegacyRows({ maps, prices });
    const filteredMaps = filtered.maps;
    const filteredPrices = filtered.prices;

    const priceByCardId = new Map(filteredPrices.map((row) => [row.devilfruit_id, row]));

    const results = filteredMaps.map((row) => {
      const priceRow = priceByCardId.get(row.devilfruit_id);
      const raw = priceRow?.raw_response || {};
      const cardPrintMetadata = parseJsonObject(row.card_print_metadata);
      const cardPrintContext = {
        setName: cardPrintMetadata?.set || null,
        releaseCode: cardPrintMetadata?.releaseCode || null,
        canonicalId: cardPrintMetadata?.canonicalId || null,
        variantSlug: row.card_print_variant_slug || null,
        variantLabel: row.card_print_variant_label || null,
      };

      return {
        cardId: row.devilfruit_id,
        canonicalId: cardPrintContext.canonicalId,
        variantSlug: cardPrintContext.variantSlug,
        lane: null,
        isVariant: String(row.devilfruit_id || "").includes("_"),
        confidence: normalizeConfidence(row.confidence),
        status: row.status,
        searchMethod: row.search_method,
        searchQuery: row.search_query,
        candidateCount: row.candidate_count,
        confidenceReasons: Array.isArray(row.confidence_reasons) ? row.confidence_reasons : [],
        notes: row.notes,
        mappedAt: row.mapped_at || null,
        reviewedAt: row.reviewed_at || null,
        cardPrintContext,
        bestCandidate: {
          id: row.justtcg_id,
          name: row.justtcg_name || raw.name || row.justtcg_id,
          set: row.justtcg_set || raw.set_name || raw.set || null,
          tcgplayerId: row.justtcg_tcgplayer_id || raw.tcgplayerId || null,
          price: priceRow?.price_nm != null ? Number(priceRow.price_nm) : null,
          lastUpdated: priceRow?.last_updated_justtcg || priceRow?.fetched_at || row.mapped_at || null,
          score: null,
          exactNumber: null,
          exactName: null,
          setMatches: null,
          classification: null,
        },
        candidatePreview: [],
      };
    });

    const priceRows = filteredPrices.map((row) => ({
      devilfruit_id: row.devilfruit_id,
      justtcg_id: row.justtcg_id,
      price_nm: row.price_nm != null ? Number(row.price_nm) : null,
      price_lp: row.price_lp != null ? Number(row.price_lp) : null,
      price_change_24h: row.price_change_24h != null ? Number(row.price_change_24h) : null,
      price_change_7d: row.price_change_7d != null ? Number(row.price_change_7d) : null,
      price_change_30d: row.price_change_30d != null ? Number(row.price_change_30d) : null,
      last_updated_justtcg: row.last_updated_justtcg,
      fetched_at: row.fetched_at,
      raw_response: row.raw_response,
    }));

    await fs.mkdir(args.outDir, { recursive: true });

    const generatedAt = new Date().toISOString();
    await fs.writeFile(
      path.join(args.outDir, "released-mapping-report.json"),
      JSON.stringify({ generatedAt, results }, null, 2),
    );
    await fs.writeFile(
      path.join(args.outDir, "approved-price-sync-data.json"),
      JSON.stringify(
        {
          generatedAt,
          fetchedAt: generatedAt,
          mappingCount: results.length,
          syncedCount: priceRows.length,
          priceRows,
          historyRows: [],
          missing: [],
        },
        null,
        2,
      ),
    );

    console.log(
      JSON.stringify(
        {
          outDir: args.outDir,
          mappingResults: results.length,
          priceRows: priceRows.length,
        },
        null,
        2,
      ),
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const isDirectRun =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  });
}
