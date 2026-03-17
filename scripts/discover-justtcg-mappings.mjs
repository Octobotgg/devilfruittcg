import path from "path";
import {
  DEFAULT_CATALOG_PATH,
  DEFAULT_MAPPING_REPORT_PATH,
  DEFAULT_MAPPING_STATE_PATH,
  chunk,
  loadJson,
  parseArgs,
  postgrestUpsert,
  readOfficialCards,
  supabaseConfigFromEnv,
  writeJson,
} from "./lib/justtcg-utils.mjs";
import {
  buildCatalogIndexes,
  detectVariantHints,
  RELEASE_CUTOFF,
  buildMixedSetBatch,
  isVariantCard,
  matchCardAgainstSnapshot,
  normalizeBandaiNumber,
  releasedCards,
  summarizeMatches,
} from "./lib/justtcg-matcher.mjs";

function sortCardsForBatch(cards) {
  return [...cards].sort((left, right) => {
    const dateCompare = String(left.releaseDate || "").localeCompare(String(right.releaseDate || ""));
    if (dateCompare !== 0) return dateCompare;
    return left.id.localeCompare(right.id, undefined, { numeric: true });
  });
}

function parseSetList(args) {
  const raw = args.sets || args["set-list"];
  if (!raw) return null;
  return new Set(
    String(raw)
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean)
  );
}

function resolveBatchCards(cards, args, state, allowedSets) {
  if (args.ids) {
    const wanted = new Set(String(args.ids).split(",").map((value) => value.trim()).filter(Boolean));
    return sortCardsForBatch(releasedCards(cards).filter((card) => wanted.has(card.id)));
  }

  if (args["sample-mix"] && args.set) {
    return buildMixedSetBatch(cards, String(args.set).trim().toUpperCase(), Number(args.limit || 50));
  }

  const filtered = sortCardsForBatch(
    releasedCards(cards).filter((card) => {
      if (args.set && card.setCode !== String(args.set).trim().toUpperCase()) return false;
      if (allowedSets && !allowedSets.has(card.setCode)) return false;
      if (state.cursorValue && card.id <= state.cursorValue) return false;
      return true;
    })
  );

  return filtered.slice(0, Number(args.limit || 80));
}

function inferTcgplayerId(candidate) {
  return candidate?.tcgplayerId || candidate?.tcgplayer_id || candidate?.tcgplayer?.id || null;
}

function buildMappingRow(card, result) {
  return {
    devilfruit_id: card.id,
    bandai_number: normalizeBandaiNumber(card),
    justtcg_id: result.best.candidate.id,
    justtcg_tcgplayer_id: inferTcgplayerId(result.best.candidate),
    justtcg_name: result.best.candidate.name,
    justtcg_set: result.best.candidate.set_name || result.best.candidate.set || null,
    search_method: result.searchMethod,
    search_query: result.searchQuery,
    candidate_count: result.candidateCount,
    confidence: result.confidence,
    confidence_reasons: result.confidenceReasons,
    status: result.status,
    mapped_at: new Date().toISOString(),
    reviewed_at: null,
    notes: result.notes,
  };
}

function buildAttemptRow(card, result) {
  return {
    devilfruit_id: card.id,
    bandai_number: normalizeBandaiNumber(card),
    attempted_at: new Date().toISOString(),
    search_method: result.searchMethod,
    search_query: result.searchQuery,
    result_count: result.candidateCount,
    best_candidate_id: result.best?.candidate?.id || null,
    decision: result.status,
    confidence: result.confidence,
    confidence_reasons: result.confidenceReasons,
    raw_response: result.candidates,
    error_detail: null,
  };
}

async function persistResults(config, attempts, mappings, stateRow) {
  if (!config) return;
  for (const group of chunk(attempts, 100)) {
    await postgrestUpsert(config, "justtcg_mapping_attempts", group, null);
  }
  if (mappings.length) {
    for (const group of chunk(mappings, 250)) {
      await postgrestUpsert(config, "justtcg_card_map", group, "devilfruit_id");
    }
  }
  await postgrestUpsert(config, "justtcg_sync_state", [stateRow], "job_name");
}

function loadCatalogSnapshot(filePath) {
  const snapshot = loadJson(filePath, null);
  if (!snapshot || !Array.isArray(snapshot.cards)) {
    throw new Error(`Catalog snapshot missing or invalid at ${filePath}. Run scripts/fetch-justtcg-catalog.mjs first.`);
  }
  const seen = new Set();
  snapshot.cards = snapshot.cards.filter((card) => {
    if (!card?.id || seen.has(card.id)) return false;
    seen.add(card.id);
    return true;
  });
  snapshot.cardCount = snapshot.cards.length;
  return snapshot;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const statePath = args["state-file"] ? path.resolve(String(args["state-file"])) : DEFAULT_MAPPING_STATE_PATH;
  const reportPath = args.report ? path.resolve(String(args.report)) : DEFAULT_MAPPING_REPORT_PATH;
  const snapshotPath = args.snapshot ? path.resolve(String(args.snapshot)) : DEFAULT_CATALOG_PATH;
  const releaseCutoff = String(args["release-cutoff"] || RELEASE_CUTOFF);
  const state = loadJson(statePath, { jobName: "justtcg_mapping_discovery", cursorValue: null, updatedAt: null });
  const writeSupabase = Boolean(args["write-supabase"]);
  const supabaseConfig = writeSupabase ? supabaseConfigFromEnv() : null;
  const allowedSets = parseSetList(args);

  if (writeSupabase && !supabaseConfig) {
    throw new Error("Missing Supabase service-role configuration for --write-supabase");
  }

  const allCards = releasedCards(readOfficialCards(), releaseCutoff);
  const snapshot = loadCatalogSnapshot(snapshotPath);
  const indexes = buildCatalogIndexes(snapshot.cards);
  const batchCards = resolveBatchCards(allCards, args, state, allowedSets);

  const results = batchCards.map((card) => {
    const result = matchCardAgainstSnapshot(card, indexes);
    return {
      card,
      result,
    };
  });

  const attempts = results.map(({ card, result }) => buildAttemptRow(card, result));
  const mappings = results
    .filter(({ result }) => result.best && result.status === "auto_approved")
    .map(({ card, result }) => buildMappingRow(card, result));

  const lastCard = batchCards[batchCards.length - 1] || null;
  const nextState = {
    job_name: "justtcg_mapping_discovery",
    cursor_value: lastCard ? lastCard.id : state.cursorValue,
    updated_at: new Date().toISOString(),
    notes: `Processed ${results.length} cards against local JustTCG snapshot ${snapshotPath}.`,
  };

  if (writeSupabase) {
    await persistResults(supabaseConfig, attempts, mappings, nextState);
  } else {
    writeJson(statePath, {
      jobName: nextState.job_name,
      cursorValue: nextState.cursor_value,
      updatedAt: nextState.updated_at,
      notes: nextState.notes,
    });
  }

  const summary = summarizeMatches(results.map(({ result }) => result));

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun: !writeSupabase,
    snapshotPath,
    snapshotCardCount: snapshot.cardCount || snapshot.cards.length,
    allowedSets: allowedSets ? [...allowedSets] : null,
    sample: batchCards.map((card) => card.id),
    summary,
    autoApproved: results
      .filter(({ result }) => result.status === "auto_approved")
      .map(({ card, result }) => ({
        cardId: card.id,
        setCode: card.setCode,
        variantType: detectVariantHints(card),
        lane: result.lane,
        confidence: result.confidence,
        confidenceReasons: result.confidenceReasons,
        bestCandidate: {
          id: result.best.candidate.id,
          name: result.best.candidate.name,
          set: result.best.candidate.set_name || result.best.candidate.set || null,
          tcgplayerId: inferTcgplayerId(result.best.candidate),
          score: result.best.score,
          price: result.best.snapshot.price,
          lastUpdated: result.best.snapshot.lastUpdated,
        },
      })),
    needsReview: results
      .filter(({ result }) => result.status === "needs_review")
      .map(({ card, result }) => ({
        cardId: card.id,
        setCode: card.setCode,
        variantType: detectVariantHints(card),
        lane: result.lane,
        confidenceReasons: result.confidenceReasons,
        notes: result.notes,
        candidateCount: result.candidateCount,
        bestCandidate: result.best
          ? {
              id: result.best.candidate.id,
              name: result.best.candidate.name,
              set: result.best.candidate.set_name || result.best.candidate.set || null,
              score: result.best.score,
            }
          : null,
      })),
    rejected: results
      .filter(({ result }) => result.status === "rejected")
      .map(({ card, result }) => ({
        cardId: card.id,
        setCode: card.setCode,
        variantType: detectVariantHints(card),
        lane: result.lane,
        confidenceReasons: result.confidenceReasons,
        notes: result.notes,
        candidateCount: result.candidateCount,
      })),
    results: results.map(({ card, result }) => ({
      cardId: card.id,
      lane: result.lane,
      isVariant: isVariantCard(card),
      confidence: result.confidence,
      status: result.status,
      searchMethod: result.searchMethod,
      searchQuery: result.searchQuery,
      candidateCount: result.candidateCount,
      confidenceReasons: result.confidenceReasons,
      notes: result.notes,
      bestCandidate: result.best
        ? {
            id: result.best.candidate.id,
            name: result.best.candidate.name,
            set: result.best.candidate.set_name || result.best.candidate.set || null,
            tcgplayerId: inferTcgplayerId(result.best.candidate),
            price: result.best.snapshot.price,
            lastUpdated: result.best.snapshot.lastUpdated,
            score: result.best.score,
            exactNumber: result.best.exactNumber,
            exactName: result.best.exactName,
            setMatches: result.best.setMatches,
            classification: result.best.classification.bucket,
          }
        : null,
      candidatePreview: result.candidates.slice(0, 5).map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        number: candidate.number || null,
        set: candidate.set_name || candidate.set || null,
      })),
    })),
  };

  writeJson(reportPath, report);

  console.log(JSON.stringify({
    reportPath,
    statePath,
    snapshotPath,
    snapshotCardCount: snapshot.cardCount || snapshot.cards.length,
    ...summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
