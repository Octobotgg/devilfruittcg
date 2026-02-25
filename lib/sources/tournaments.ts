// Tournament results source stubs (Limitless, Battleroyale, community events)
// Replace with real scrapers/API calls. Shapes are normalized for aggregation.

export interface TournamentEvent {
  id: string;
  name: string;
  region?: string;
  date?: string;
  players?: number;
  source?: string;
}

export interface TournamentResult {
  eventId: string;
  player: string;
  deck: string;
  placing: number;
  wins: number;
  losses: number;
  draws?: number;
}

export interface TournamentAggregation {
  deckWinRates: Record<string, { wins: number; losses: number; draws: number; entries: number }>;
  popularity: Record<string, number>; // % field share
}

export async function fetchTournamentResults(): Promise<{ events: TournamentEvent[]; results: TournamentResult[] }> {
  // TODO: Implement real fetch/scrape for tournament results.
  // Placeholder empty to allow graceful fallback.
  return { events: [], results: [] };
}

export function aggregateTournamentData(results: TournamentResult[], totalPlayers?: number): TournamentAggregation {
  const deckWinRates: TournamentAggregation["deckWinRates"] = {} as TournamentAggregation["deckWinRates"];
  const popularity: TournamentAggregation["popularity"] = {} as TournamentAggregation["popularity"];

  for (const r of results) {
    deckWinRates[r.deck] ??= { wins: 0, losses: 0, draws: 0, entries: 0 };
    deckWinRates[r.deck].wins += r.wins;
    deckWinRates[r.deck].losses += r.losses;
    deckWinRates[r.deck].draws += r.draws ?? 0;
    deckWinRates[r.deck].entries += 1;
    popularity[r.deck] = (popularity[r.deck] ?? 0) + 1;
  }

  if (totalPlayers) {
    for (const deck of Object.keys(popularity)) {
      popularity[deck] = Math.round((popularity[deck] / totalPlayers) * 1000) / 10; // percent with 0.1 granularity
    }
  }

  return { deckWinRates, popularity };
}
