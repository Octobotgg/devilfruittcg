import type { MetaDeck } from "@/lib/meta-decks";

export interface KaizokuSnapshot {
  source: string;
  updatedAt: string;
  sampleGames: number;
  decks: MetaDeck[];
}

function asNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeDeck(raw: Record<string, unknown>): MetaDeck | null {
  const id = String(raw.id || "").trim();
  const name = String(raw.name || "").trim();
  const cardId = String(raw.cardId || "").trim();
  if (!id || !name || !cardId) return null;

  return {
    id,
    name,
    leader: String(raw.leader || name),
    cardId,
    color: String(raw.color || "Mixed"),
    tier: (["S", "A", "B", "C", "D"].includes(String(raw.tier)) ? String(raw.tier) : "C") as MetaDeck["tier"],
    metaShare: asNumber(raw.metaShare, 0),
    winRate: asNumber(raw.winRate, 50),
    trend: (["up", "down", "stable"].includes(String(raw.trend)) ? String(raw.trend) : "stable") as MetaDeck["trend"],
    description: String(raw.description || "Kaizoku matchup aggregate"),
    matchups: (raw.matchups && typeof raw.matchups === "object" ? raw.matchups : {}) as Record<string, number>,
  };
}

export async function fetchKaizokuMatchups(limit = 12): Promise<KaizokuSnapshot | null> {
  const url = process.env.KAIZOKU_MATCHUPS_URL;
  if (!url) return null;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" },
      next: { revalidate: 900 },
    });
    if (!res.ok) return null;
    const json = await res.json();

    const decksRaw = Array.isArray(json?.decks) ? json.decks : [];
    const decks = decksRaw
      .map((d: Record<string, unknown>) => normalizeDeck(d))
      .filter((d: MetaDeck | null): d is MetaDeck => Boolean(d))
      .slice(0, limit);

    if (!decks.length) return null;

    return {
      source: String(json?.source || "kaizoku"),
      updatedAt: String(json?.updatedAt || new Date().toISOString()),
      sampleGames: asNumber(json?.sampleGames, 0),
      decks,
    };
  } catch {
    return null;
  }
}
