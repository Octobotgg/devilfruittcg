// OPTCG Sim data source stubs
// Replace these with real fetchers/parsers once endpoints/credentials are known.
// Shape: normalized matchup entries and event summaries.

export interface SimMatchupRecord {
  eventId: string;
  eventName: string;
  playerDeck: string;
  opponentDeck: string;
  result: "win" | "loss" | "draw";
  round: number;
  region?: string;
  timestamp?: string;
}

export interface SimAggregation {
  decks: Record<string, { wins: number; losses: number; draws: number }>;
  matrix: Record<string, Record<string, { wins: number; losses: number; draws: number }>>;
}

export async function fetchOptcgSimLogs(): Promise<SimMatchupRecord[]> {
  // TODO: Implement real fetch from OPTCG Sim logs/feed when available.
  // For now return empty array; callers should fallback to seeded data.
  return [];
}

export function aggregateSimData(records: SimMatchupRecord[]): SimAggregation {
  const decks: SimAggregation["decks"] = {} as SimAggregation["decks"];
  const matrix: SimAggregation["matrix"] = {} as SimAggregation["matrix"];

  for (const r of records) {
    const d = r.playerDeck;
    const o = r.opponentDeck;
    const isWin = r.result === "win";
    const isLoss = r.result === "loss";
    const isDraw = r.result === "draw";

    decks[d] ??= { wins: 0, losses: 0, draws: 0 };
    decks[o] ??= { wins: 0, losses: 0, draws: 0 };
    matrix[d] ??= {};
    matrix[d][o] ??= { wins: 0, losses: 0, draws: 0 };

    if (isWin) { decks[d].wins++; decks[o].losses++; matrix[d][o].wins++; }
    if (isLoss) { decks[d].losses++; decks[o].wins++; matrix[d][o].losses++; }
    if (isDraw) { decks[d].draws++; decks[o].draws++; matrix[d][o].draws++; }
  }

  return { decks, matrix };
}
