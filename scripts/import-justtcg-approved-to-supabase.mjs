import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const REPO_ROOT = "/Users/javierbarro/Desktop/devilfruittcg";
const CARDS_PATH = path.join(REPO_ROOT, "data", "bandai-en-official-cards.json");
const DEFAULT_MAPPING_REPORT_PATH = path.join(REPO_ROOT, ".cache", "justtcg", "released-mapping-report.json");
const DEFAULT_PRICE_DATA_PATH = path.join(REPO_ROOT, ".cache", "justtcg", "approved-price-sync-data.json");

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function chunk(items, size) {
  const groups = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

function normalizeBandaiNumber(card) {
  return `${card.setCode}-${String(card.number || "").padStart(3, "0")}`;
}

function buildMappingRows(mappingReportPath) {
  const cards = readJson(CARDS_PATH);
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const report = readJson(mappingReportPath);
  return report.results
    .filter((entry) => entry.status === "auto_approved" && entry.bestCandidate)
    .map((entry) => {
      const card = cardById.get(entry.cardId);
      if (!card) {
        throw new Error(`Missing official card for ${entry.cardId}`);
      }
      return {
        devilfruit_id: entry.cardId,
        bandai_number: normalizeBandaiNumber(card),
        justtcg_id: entry.bestCandidate.id,
        justtcg_tcgplayer_id: entry.bestCandidate.tcgplayerId || null,
        justtcg_name: entry.bestCandidate.name,
        justtcg_set: entry.bestCandidate.set || null,
        search_method: entry.searchMethod,
        search_query: entry.searchQuery,
        candidate_count: entry.candidateCount,
        confidence: entry.confidence,
        confidence_reasons: entry.confidenceReasons,
        status: "auto_approved",
        mapped_at: report.generatedAt,
        reviewed_at: null,
        notes: entry.notes || null,
      };
    });
}

function buildPriceRows(priceDataPath) {
  const data = readJson(priceDataPath);
  return {
    priceRows: data.priceRows || [],
    historyRows: data.historyRows || [],
  };
}

async function upsertChunks({ supabase, table, rows, chunkSize, onProgress }) {
  const groups = chunk(rows, chunkSize);
  for (const [index, group] of groups.entries()) {
    onProgress?.(index + 1, groups.length, group.length);
    const { error } = await supabase.from(table).upsert(group, { onConflict: "devilfruit_id" });
    if (error) {
      throw error;
    }
  }
}

async function insertChunks({ supabase, table, rows, chunkSize, onProgress }) {
  const groups = chunk(rows, chunkSize);
  for (const [index, group] of groups.entries()) {
    onProgress?.(index + 1, groups.length, group.length);
    const { error } = await supabase.from(table).insert(group);
    if (error) {
      throw error;
    }
  }
}

async function getCount(supabase, table) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabaseUrl = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const supabaseKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "").trim();
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const mappingReportPath = path.resolve(String(args["mapping-report"] || DEFAULT_MAPPING_REPORT_PATH));
  const priceDataPath = path.resolve(String(args["price-data"] || DEFAULT_PRICE_DATA_PATH));
  const mappingChunkSize = Math.max(1, Number(args["mapping-chunk-size"] || 100));
  const priceChunkSize = Math.max(1, Number(args["price-chunk-size"] || 25));
  const historyChunkSize = Math.max(1, Number(args["history-chunk-size"] || 100));

  const mappingRows = buildMappingRows(mappingReportPath);
  const { priceRows, historyRows } = buildPriceRows(priceDataPath);

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await upsertChunks({
    supabase,
    table: "justtcg_card_map",
    rows: mappingRows,
    chunkSize: mappingChunkSize,
    onProgress: (current, total, size) => console.log(`Upserting card_map chunk ${current}/${total} (${size} rows)`),
  });

  await upsertChunks({
    supabase,
    table: "justtcg_prices",
    rows: priceRows,
    chunkSize: priceChunkSize,
    onProgress: (current, total, size) => console.log(`Upserting prices chunk ${current}/${total} (${size} rows)`),
  });

  await insertChunks({
    supabase,
    table: "justtcg_price_history",
    rows: historyRows,
    chunkSize: historyChunkSize,
    onProgress: (current, total, size) => console.log(`Inserting history chunk ${current}/${total} (${size} rows)`),
  });

  const counts = {
    justtcg_card_map: await getCount(supabase, "justtcg_card_map"),
    justtcg_prices: await getCount(supabase, "justtcg_prices"),
    justtcg_price_history: await getCount(supabase, "justtcg_price_history"),
  };

  console.log(JSON.stringify({
    mappingRows: mappingRows.length,
    priceRows: priceRows.length,
    historyRows: historyRows.length,
    counts,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
