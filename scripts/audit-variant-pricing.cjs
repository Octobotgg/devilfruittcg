/* eslint-disable no-console */
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

function arg(name, fallback = undefined) {
  const key = `--${name}`;
  const i = process.argv.indexOf(key);
  if (i === -1) return fallback;
  return process.argv[i + 1] ?? fallback;
}

function argInt(name, fallback) {
  const v = arg(name);
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function summarizeIssues(records) {
  const byIssue = {};
  const byVariant = {};

  for (const r of records) {
    const variant = r.variantLabel || "UNKNOWN";
    byVariant[variant] = byVariant[variant] || { total: 0, issueCount: 0, mockCount: 0, lowSalesCount: 0 };
    byVariant[variant].total += 1;

    if (r.issues?.length) {
      byVariant[variant].issueCount += 1;
    }

    if (r.issues?.includes("mock_source")) byVariant[variant].mockCount += 1;
    if (r.issues?.includes("low_sales")) byVariant[variant].lowSalesCount += 1;

    for (const issue of r.issues || []) {
      byIssue[issue] = (byIssue[issue] || 0) + 1;
    }
  }

  return { byIssue, byVariant };
}

async function fetchJson(url, timeoutMs = 25000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText} ${text.slice(0, 160)}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function loadCards(baseUrl, pageSize = 200) {
  const cards = [];
  let page = 1;

  // Hard safety cap to avoid infinite loops if API is misbehaving.
  while (page <= 200) {
    const url = `${baseUrl}/api/cards?page=${page}&pageSize=${pageSize}`;
    const json = await fetchJson(url, 30000);
    const rows = Array.isArray(json?.results) ? json.results : [];
    if (!rows.length) break;

    cards.push(...rows);
    page += 1;

    const total = Number(json?.total || 0);
    if (total > 0 && cards.length >= total) break;
  }

  return cards;
}

function isEnglishCard(card) {
  const name = String(card?.name || "");
  if (!/[A-Za-z]/.test(name)) return false;
  return !/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(name);
}

function analyzeRecord(card, payload, elapsedMs) {
  const ebay = payload?.ebay || {};
  const queryTemplate = ebay.queryTemplate || null;
  const sales = Array.isArray(ebay.sales) ? ebay.sales : [];
  const source = String(ebay.source || "unknown");
  const saleCount = Number(ebay.saleCount || 0);
  const quality = Number(ebay.qualityConfidence || 0);
  const filteredOut = Number(ebay.filteredOut || 0);

  const issues = [];

  if (!queryTemplate) issues.push("missing_query_template");
  if (source === "mock") issues.push("mock_source");
  if (source === "active") issues.push("active_only");

  if (saleCount < 3) issues.push("low_sales");
  if (quality < 0.55) issues.push("low_confidence");

  const hasNonEnglishTitle = sales.some((s) => /\b(japanese|jp ver|jp\b|korean|chinese)\b/i.test(String(s?.title || "")));
  if (hasNonEnglishTitle) issues.push("language_noise");

  if (queryTemplate?.variantLabel && card?.variantLabel && queryTemplate.variantLabel !== card.variantLabel) {
    issues.push("variant_label_mismatch");
  }

  const noisyFilterRatio = saleCount > 0 ? filteredOut / Math.max(1, saleCount) : filteredOut > 0 ? 99 : 0;
  if (noisyFilterRatio >= 6) issues.push("high_filter_ratio");

  return {
    cardId: card.id,
    baseCardId: card.baseCardId || card.id,
    canonicalVariantId: card.canonicalVariantId || null,
    name: card.name,
    rarity: card.rarity,
    variantLabel: card.variantLabel || null,
    variantType: card.variantType || null,
    ebaySource: source,
    saleCount,
    qualityConfidence: quality,
    filteredOut,
    averagePrice: Number(ebay.averagePrice || 0),
    query: queryTemplate?.query || null,
    searchUrl: queryTemplate?.searchUrl || null,
    issues,
    elapsedMs,
    checkedAt: new Date().toISOString(),
  };
}

async function main() {
  const baseUrl = String(arg("base", "https://devilfruittcg.gg")).replace(/\/$/, "");
  const pageSize = Math.max(20, Math.min(250, argInt("pageSize", 200)));
  const maxCards = argInt("maxCards", 180);
  const concurrency = Math.max(1, Math.min(8, argInt("concurrency", 3)));
  const delayMs = Math.max(0, Math.min(3000, argInt("delayMs", 250)));
  const resume = hasFlag("resume");

  const cacheDir = path.join(process.cwd(), ".cache", "phase2b");
  const statePath = arg("state", path.join(cacheDir, "variant-pricing-state.json"));
  const outPath = arg("out", path.join(cacheDir, `variant-pricing-report-${Date.now()}.json`));

  await fsp.mkdir(path.dirname(statePath), { recursive: true });
  await fsp.mkdir(path.dirname(outPath), { recursive: true });

  let state = {
    baseUrl,
    updatedAt: new Date().toISOString(),
    processed: {},
  };

  if (resume && fs.existsSync(statePath)) {
    try {
      state = JSON.parse(await fsp.readFile(statePath, "utf8"));
      if (!state.processed || typeof state.processed !== "object") {
        state.processed = {};
      }
    } catch {
      // ignore bad state and start fresh
    }
  }

  console.log(`[phase2b] loading cards from ${baseUrl}...`);
  const cardsRaw = await loadCards(baseUrl, pageSize);
  const cards = cardsRaw.filter(isEnglishCard);
  console.log(`[phase2b] total cards loaded=${cardsRaw.length}, EN cards=${cards.length}`);

  const unprocessed = cards.filter((c) => !state.processed[c.id]);
  const queue = (maxCards > 0 ? unprocessed.slice(0, maxCards) : unprocessed).map((c) => ({
    id: c.id,
    name: c.name,
    rarity: c.rarity,
    variantLabel: c.variantLabel,
    variantType: c.variantType,
    canonicalVariantId: c.canonicalVariantId,
    baseCardId: c.baseCardId,
  }));

  console.log(`[phase2b] processing=${queue.length} cards (concurrency=${concurrency}, delay=${delayMs}ms)`);

  const records = [];
  let index = 0;
  let completed = 0;

  async function worker() {
    while (true) {
      const i = index++;
      if (i >= queue.length) return;
      const card = queue[i];

      const started = Date.now();
      let record;

      try {
        if (delayMs > 0) await sleep(delayMs);
        const payload = await fetchJson(`${baseUrl}/api/market?id=${encodeURIComponent(card.id)}`, 35000);
        record = analyzeRecord(card, payload, Date.now() - started);
      } catch (error) {
        record = {
          cardId: card.id,
          baseCardId: card.baseCardId || card.id,
          canonicalVariantId: card.canonicalVariantId || null,
          name: card.name,
          rarity: card.rarity,
          variantLabel: card.variantLabel || null,
          variantType: card.variantType || null,
          ebaySource: "error",
          saleCount: 0,
          qualityConfidence: 0,
          filteredOut: 0,
          averagePrice: 0,
          query: null,
          searchUrl: null,
          issues: ["request_error"],
          error: String(error?.message || error),
          elapsedMs: Date.now() - started,
          checkedAt: new Date().toISOString(),
        };
      }

      records.push(record);
      state.processed[card.id] = {
        checkedAt: record.checkedAt,
        issues: record.issues,
        saleCount: record.saleCount,
        qualityConfidence: record.qualityConfidence,
      };

      completed += 1;
      if (completed % 25 === 0 || completed === queue.length) {
        state.updatedAt = new Date().toISOString();
        await fsp.writeFile(statePath, JSON.stringify(state, null, 2));
        console.log(`[phase2b] progress ${completed}/${queue.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const summary = summarizeIssues(records);
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    settings: {
      pageSize,
      maxCards,
      concurrency,
      delayMs,
      resumed: resume,
    },
    totals: {
      processedThisRun: records.length,
      processedOverall: Object.keys(state.processed).length,
      cardsAvailableEn: cards.length,
      withIssues: records.filter((r) => (r.issues || []).length > 0).length,
      mockSource: records.filter((r) => (r.issues || []).includes("mock_source")).length,
      requestErrors: records.filter((r) => (r.issues || []).includes("request_error")).length,
    },
    summary,
    topAttention: records
      .filter((r) => (r.issues || []).includes("mock_source") || (r.issues || []).includes("low_sales") || (r.issues || []).includes("low_confidence"))
      .sort((a, b) => (b.issues?.length || 0) - (a.issues?.length || 0))
      .slice(0, 120),
    records,
  };

  await fsp.writeFile(outPath, JSON.stringify(report, null, 2));
  await fsp.writeFile(statePath, JSON.stringify(state, null, 2));

  console.log(`[phase2b] report written -> ${outPath}`);
  console.log(`[phase2b] state written  -> ${statePath}`);
  console.log(`[phase2b] issues summary ->`, summary.byIssue);
}

main().catch((error) => {
  console.error("[phase2b] failed:", error?.message || error);
  process.exit(1);
});
