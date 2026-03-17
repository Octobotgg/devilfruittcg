import {
  DEFAULT_CATALOG_PATH,
  chunk,
  ensureDir,
  inferTcgplayerId,
  parseArgs,
  postgrestInsertReturning,
  postgrestUpsert,
  supabaseConfigFromEnv,
  writeJson,
} from "./lib/justtcg-utils.mjs";

const DEFAULT_GAME = "one-piece-card-game";
const DEFAULT_LIMIT = 100;
const DEFAULT_DELAY_MS = 500;
const MAX_RETRIES = 4;
const RETRY_BASE_MS = 3000;

function dedupeCards(cards) {
  const seen = new Set();
  const unique = [];
  for (const card of cards) {
    if (!card?.id || seen.has(card.id)) continue;
    seen.add(card.id);
    unique.push(card);
  }
  return unique;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage({ apiKey, game, limit, offset, includeNullPrices }) {
  const params = new URLSearchParams({
    game,
    limit: String(limit),
    offset: String(offset),
  });
  if (includeNullPrices) params.set("include_null_prices", "true");

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const response = await fetch(`https://api.justtcg.com/v1/cards?${params.toString()}`, {
      headers: {
        "X-API-Key": apiKey,
        "User-Agent": "DevilFruitTCG/JustTCGCatalogFetch",
      },
    });

    const text = await response.text();
    let payload;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { raw: text };
    }

    if (response.ok) {
      return {
        cards: Array.isArray(payload?.data) ? payload.data : [],
        meta: payload?.meta || null,
      };
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

    throw new Error(`JustTCG ${response.status}: ${payload?.error || payload?.message || text || "request failed"}`);
  }
  return { cards: [], meta: null };
}

async function persistSnapshotToSupabase(config, snapshot) {
  const inserted = await postgrestInsertReturning(config, "justtcg_catalog_snapshots", [{
    game: snapshot.game,
    fetched_at: snapshot.fetchedAt,
    page_count: snapshot.pageCount,
    card_count: snapshot.cardCount,
    notes: snapshot.notes,
  }]);

  const snapshotId = inserted?.[0]?.id;
  if (!snapshotId) {
    throw new Error("Supabase did not return a snapshot ID for justtcg_catalog_snapshots");
  }

  const rows = snapshot.cards.map((card) => ({
    snapshot_id: snapshotId,
    justtcg_id: card.id,
    name: card.name,
    number: card.number || null,
    set_name: card.set_name || card.set || null,
    tcgplayer_id: inferTcgplayerId(card),
    raw_response: card,
  }));

  for (const group of chunk(rows, 250)) {
    await postgrestUpsert(config, "justtcg_catalog_cards", group, "snapshot_id,justtcg_id");
  }

  return snapshotId;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = String(process.env.JUSTTCG_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("Missing JUSTTCG_API_KEY");
  }

  const game = String(args.game || DEFAULT_GAME).trim();
  const limit = Math.max(1, Number(args.limit || DEFAULT_LIMIT));
  const delayMs = Math.max(0, Number(args["delay-ms"] || DEFAULT_DELAY_MS));
  const includeNullPrices = !args["exclude-null-prices"];
  const outputPath = args.out ? String(args.out) : DEFAULT_CATALOG_PATH;
  const maxPages = args["max-pages"] ? Number(args["max-pages"]) : null;
  const writeSupabase = Boolean(args["write-supabase"]);
  const supabaseConfig = writeSupabase ? supabaseConfigFromEnv() : null;

  if (writeSupabase && !supabaseConfig) {
    throw new Error("Missing Supabase service-role configuration for --write-supabase");
  }

  const cards = [];
  let offset = 0;
  let pageCount = 0;
  let lastMeta = null;

  while (true) {
    if (maxPages && pageCount >= maxPages) break;
    const page = await fetchPage({
      apiKey,
      game,
      limit,
      offset,
      includeNullPrices,
    });

    cards.push(...page.cards);
    pageCount += 1;
    lastMeta = page.meta;
    if (page.cards.length < limit) break;
    offset += limit;
    if (delayMs) await sleep(delayMs);
  }

  const uniqueCards = dedupeCards(cards);

  const snapshot = {
    game,
    fetchedAt: new Date().toISOString(),
    pageCount,
    pageSize: limit,
    rawCardCount: cards.length,
    cardCount: uniqueCards.length,
    totalReported: lastMeta?.total ?? null,
    notes: `Fetched from JustTCG cards endpoint with include_null_prices=${includeNullPrices}`,
    cards: uniqueCards,
  };

  ensureDir(outputPath);
  writeJson(outputPath, snapshot);

  let snapshotId = null;
  if (writeSupabase) {
    snapshotId = await persistSnapshotToSupabase(supabaseConfig, snapshot);
  }

  console.log(JSON.stringify({
    outputPath,
    snapshotId,
    game,
    pageCount,
    rawCardCount: cards.length,
    cardCount: uniqueCards.length,
    totalReported: lastMeta?.total ?? null,
    includeNullPrices,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
