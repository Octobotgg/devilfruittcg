import {
  chunk,
  loadJson,
  parseArgs,
  postgrestInsert,
  postgrestUpsert,
  supabaseConfigFromEnv,
  writeJson,
} from "./lib/justtcg-utils.mjs";

const JUSTTCG_CARDS_URL = "https://api.justtcg.com/v1/cards";
const DEFAULT_REPORT_PATH = "/tmp/justtcg-price-sync-report.json";
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_DELAY_MS = 500;
const MAX_RETRIES = 4;
const RETRY_BASE_MS = 3000;
const REQUEST_TIMEOUT_MS = 20000;

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchApprovedMappings(config) {
  const rows = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const url = new URL(`${config.url}/rest/v1/justtcg_card_map`);
    url.searchParams.set("select", "devilfruit_id,justtcg_id,justtcg_tcgplayer_id,status");
    url.searchParams.set("status", "in.(auto_approved,manually_approved)");
    url.searchParams.set("order", "devilfruit_id.asc");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    const response = await fetch(url, {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load approved mappings: ${response.status} ${await response.text()}`);
    }

    const batch = await response.json();
    rows.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }

  return rows.filter((row) => row.justtcg_tcgplayer_id);
}

function fetchApprovedMappingsFromReport(reportPath) {
  const report = loadJson(reportPath, null);
  if (!report || !Array.isArray(report.results)) {
    throw new Error(`Invalid mapping report at ${reportPath}`);
  }
  return report.results
    .filter((row) => row.status === "auto_approved" && row.bestCandidate?.tcgplayerId)
    .map((row) => ({
      devilfruit_id: row.cardId,
      justtcg_id: row.bestCandidate.id,
      justtcg_tcgplayer_id: row.bestCandidate.tcgplayerId,
      status: "auto_approved",
    }));
}

async function fetchBulkCards(apiKey, payload) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    let timeout;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const response = await fetch(JUSTTCG_CARDS_URL, {
        method: "POST",
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
          "User-Agent": "DevilFruitTCG/JustTCGPriceSync",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const text = await response.text();
      let json;
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { raw: text };
      }

      if (response.ok) {
        return json?.data || [];
      }

      const retriable = response.status === 429 || response.status >= 500;
      if (retriable && attempt < MAX_RETRIES) {
        const retryAfterHeader = Number(response.headers.get("retry-after"));
        const waitMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
          ? retryAfterHeader * 1000
          : RETRY_BASE_MS * (attempt + 1);
        await sleep(waitMs);
        continue;
      }

      throw new Error(`JustTCG bulk cards failed: ${response.status} ${json?.error || json?.message || text || "request failed"}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retriable = error instanceof TypeError || /fetch failed|network|timeout|aborted/i.test(message);
      if (retriable && attempt < MAX_RETRIES) {
        await sleep(RETRY_BASE_MS * (attempt + 1));
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  return [];
}

function variantSortScore(variant, preferredCondition) {
  const condition = String(variant.condition || "").toLowerCase();
  const printing = String(variant.printing || "").toLowerCase();
  const language = String(variant.language || "").toLowerCase();

  let score = 0;
  if (language === "english") score += 100;
  if (condition === preferredCondition) score += 60;
  if (printing === "normal") score += 20;
  if (printing === "foil") score += 10;
  return score;
}

function pickVariant(card, preferredCondition) {
  const variants = Array.isArray(card?.variants) ? card.variants : [];
  if (!variants.length) return null;
  const sorted = [...variants].sort((left, right) => variantSortScore(right, preferredCondition) - variantSortScore(left, preferredCondition));
  return sorted[0] || null;
}

function toIsoFromUnix(value) {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

function extractPriceRow(mapping, card, fetchedAt) {
  const nm = pickVariant(card, "near mint");
  const lp = pickVariant(card, "lightly played");
  return {
    devilfruit_id: mapping.devilfruit_id,
    justtcg_id: mapping.justtcg_id,
    price_nm: typeof nm?.price === "number" ? nm.price : null,
    price_lp: typeof lp?.price === "number" ? lp.price : null,
    price_change_24h: typeof nm?.priceChange24hr === "number" ? nm.priceChange24hr : null,
    price_change_7d: typeof nm?.priceChange7d === "number" ? nm.priceChange7d : null,
    price_change_30d: typeof nm?.priceChange30d === "number" ? nm.priceChange30d : null,
    last_updated_justtcg: toIsoFromUnix(nm?.lastUpdated),
    fetched_at: fetchedAt,
    raw_response: card,
  };
}

function extractHistoryRow(priceRow) {
  return {
    devilfruit_id: priceRow.devilfruit_id,
    price_nm: priceRow.price_nm,
    recorded_at: priceRow.fetched_at,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = String(process.env.JUSTTCG_API_KEY || "").trim();
  const supabaseConfig = supabaseConfigFromEnv();
  const reportPath = String(args.report || DEFAULT_REPORT_PATH);
  const mappingReportPath = args["mapping-report"] ? String(args["mapping-report"]) : null;
  const pricesOutPath = args["prices-out"] ? String(args["prices-out"]) : null;
  const batchSize = Math.max(1, Math.min(100, Number(args["batch-size"] || DEFAULT_BATCH_SIZE)));
  const delayMs = Math.max(0, Number(args["delay-ms"] || DEFAULT_DELAY_MS));
  const priceChunkSize = Math.max(1, Number(args["price-chunk-size"] || 50));
  const historyChunkSize = Math.max(1, Number(args["history-chunk-size"] || 200));
  const skipWrite = Boolean(args["skip-write"]);

  if (!apiKey) {
    throw new Error("Missing JUSTTCG_API_KEY");
  }
  if (!mappingReportPath && !supabaseConfig) {
    throw new Error("Missing Supabase service-role configuration");
  }

  const mappings = mappingReportPath
    ? fetchApprovedMappingsFromReport(mappingReportPath)
    : await fetchApprovedMappings(supabaseConfig);
  const byTcgplayerId = new Map();
  for (const row of mappings) {
    const key = String(row.justtcg_tcgplayer_id);
    const existing = byTcgplayerId.get(key) || [];
    existing.push(row);
    byTcgplayerId.set(key, existing);
  }
  const batches = chunk([...byTcgplayerId.keys()], batchSize);
  const fetchedAt = new Date().toISOString();
  const priceRows = [];
  const historyRows = [];
  const missing = [];

  for (const [index, batch] of batches.entries()) {
    console.log(`Fetching JustTCG price batch ${index + 1}/${batches.length} (${batch.length} ids)`);
    const payload = batch.map((tcgplayerId) => ({ tcgplayerId }));
    const cards = await fetchBulkCards(apiKey, payload);
    const returnedIds = new Set();

    for (const card of cards) {
      const tcgplayerId = String(card.tcgplayerId || "");
      returnedIds.add(tcgplayerId);
      const candidateMappings = byTcgplayerId.get(tcgplayerId);
      if (!candidateMappings?.length) continue;
      for (const mapping of candidateMappings) {
        const priceRow = extractPriceRow(mapping, card, fetchedAt);
        priceRows.push(priceRow);
        historyRows.push(extractHistoryRow(priceRow));
      }
    }

    for (const tcgplayerId of batch) {
      if (!returnedIds.has(String(tcgplayerId))) {
        const candidateMappings = byTcgplayerId.get(String(tcgplayerId)) || [];
        for (const mapping of candidateMappings) {
          missing.push({
            devilfruit_id: mapping.devilfruit_id,
            justtcg_tcgplayer_id: mapping.justtcg_tcgplayer_id,
          });
        }
      }
    }

    if (delayMs) await sleep(delayMs);
  }

  if (!skipWrite) {
    if (!supabaseConfig) {
      throw new Error("Missing Supabase service-role configuration for write step");
    }
    for (const group of chunk(priceRows, priceChunkSize)) {
      await postgrestUpsert(supabaseConfig, "justtcg_prices", group, "devilfruit_id");
    }
    for (const group of chunk(historyRows, historyChunkSize)) {
      await postgrestInsert(supabaseConfig, "justtcg_price_history", group);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    fetchedAt,
    mappingReportPath,
    mappingCount: mappings.length,
    batchSize,
    batchCount: batches.length,
    priceChunkSize,
    historyChunkSize,
    syncedCount: priceRows.length,
    historyCount: historyRows.length,
    missingCount: missing.length,
    missing,
  };

  writeJson(reportPath, report);
  if (pricesOutPath) {
    writeJson(pricesOutPath, {
      generatedAt: report.generatedAt,
      fetchedAt,
      mappingCount: mappings.length,
      syncedCount: priceRows.length,
      priceRows,
      historyRows,
      missing,
    });
  }
  console.log(JSON.stringify({
    reportPath,
    pricesOutPath,
    mappingCount: mappings.length,
    batchCount: batches.length,
    syncedCount: priceRows.length,
    missingCount: missing.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
