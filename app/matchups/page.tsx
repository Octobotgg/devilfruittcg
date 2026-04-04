import type { Metadata } from "next";
import MatchupsPageClient from "@/components/matchups/MatchupsPageClient";
import type { MatchupsInitialPayload, MatchupsLeader } from "@/components/matchups/MatchupsPageClient";
import { unstable_cache } from "next/cache";
import { getHybridMatchupPayload } from "@/lib/competitive-insights";
import {
  MATCHUPS_DEFAULT_LIMIT,
  MATCHUPS_DEFAULT_PERIOD,
  MATCHUPS_DEFAULT_SET,
  MATCHUPS_PAGE_RANGE,
} from "@/lib/constants/page-defaults";
import { OFFICIAL_BASE_CARDS } from "@/lib/official-cards";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "One Piece TCG Matchup Matrix",
  description: "Compare One Piece TCG deck matchups, head-to-head win rates, and matchup pressure on Devil Fruit TCG.",
  alternates: {
    canonical: absoluteUrl("/matchups"),
  },
};

export const revalidate = 300;

const getCachedMatchupsPayload = unstable_cache(
  async () =>
    getHybridMatchupPayload({
      set: MATCHUPS_DEFAULT_SET,
      range: MATCHUPS_PAGE_RANGE,
      period: MATCHUPS_DEFAULT_PERIOD,
      limit: MATCHUPS_DEFAULT_LIMIT,
    }).catch(() => null),
  ["matchups-page-default-payload"],
  { revalidate }
);

function getInitialLeaders(): MatchupsLeader[] {
  return OFFICIAL_BASE_CARDS
    .filter((card) => card.type === "Leader")
    .map((card) => ({ id: card.id, name: card.name, setCode: card.setCode, color: card.color }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export default async function MatchupsPage() {
  const payload = await getCachedMatchupsPayload();

  const initialIsLive = Boolean(payload && !String(payload.source || "").toLowerCase().includes("seeded"));
  const initialPayload: MatchupsInitialPayload = payload
    ? {
        source: payload.source,
        updatedAt: initialIsLive ? payload.updatedAt : null,
        sampleGames: initialIsLive ? payload.sampleGames : 0,
        sampleLabel: initialIsLive ? payload.sampleLabel || null : "Live data unavailable",
        sampleDescription: initialIsLive ? payload.sampleDescription || null : "Showing fallback matchup snapshot",
        comparableSample: initialIsLive ? payload.comparableSample !== false : false,
        decks: payload.decks,
      }
    : {
        source: "seeded",
        updatedAt: null,
        sampleGames: 0,
        sampleLabel: "Live data unavailable",
        sampleDescription: "Showing fallback matchup snapshot",
        comparableSample: false,
        decks: [],
      };

  return (
    <MatchupsPageClient
      initialPayload={initialPayload}
      initialLeaders={getInitialLeaders()}
      initialIsLive={initialIsLive}
    />
  );
}
