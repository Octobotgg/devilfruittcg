import path from "path";
import {
  chunk,
  loadJson,
  parseArgs,
  postgrestUpsert,
  readOfficialCards,
  supabaseConfigFromEnv,
} from "./lib/justtcg-utils.mjs";
import { normalizeBandaiNumber } from "./lib/justtcg-matcher.mjs";

function cardMapById() {
  return new Map(readOfficialCards().map((card) => [card.id, card]));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const reportPath = path.resolve(String(args.report));
  const chunkSize = Math.max(1, Number(args["chunk-size"] || 50));
  const supabaseConfig = supabaseConfigFromEnv();
  if (!reportPath) {
    throw new Error("Missing --report");
  }
  if (!supabaseConfig) {
    throw new Error("Missing Supabase service-role configuration");
  }

  const report = loadJson(reportPath, null);
  if (!report || !Array.isArray(report.results)) {
    throw new Error(`Invalid mapping report at ${reportPath}`);
  }

  const cards = cardMapById();
  const rows = report.results
    .filter((entry) => entry.status === "auto_approved" && entry.bestCandidate)
    .map((entry) => {
      const card = cards.get(entry.cardId);
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
        mapped_at: new Date().toISOString(),
        reviewed_at: null,
        notes: entry.notes,
      };
    });

  const groups = chunk(rows, chunkSize);
  for (const [index, group] of groups.entries()) {
    console.log(`Uploading mapping chunk ${index + 1}/${groups.length} (${group.length} rows)`);
    await postgrestUpsert(supabaseConfig, "justtcg_card_map", group, "devilfruit_id");
  }

  console.log(JSON.stringify({
    reportPath,
    uploaded: rows.length,
    chunkSize,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
