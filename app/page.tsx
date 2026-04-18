import HomePageClient from "@/components/home/HomePageClient";
import type { HomeMatchupPayload } from "@/components/home/HomePageClient";
import { unstable_cache } from "next/cache";
import { getHybridMatchupPayload, getHybridMetaPayload } from "@/lib/competitive-insights";
import { buildHomeBountyStateFromMarketWatch } from "@/lib/home-bounty";
import { getMarketHomeReadModel, toLegacyMarketWatchShape } from "@/lib/server/market/market-home";
import {
  HOME_META_FORMAT,
  HOME_META_RANGE,
  HOME_META_REGION,
  MATCHUPS_DEFAULT_FORMAT,
  MATCHUPS_DEFAULT_LIMIT,
  MATCHUPS_DEFAULT_PERIOD,
  MATCHUPS_PAGE_RANGE,
} from "@/lib/constants/page-defaults";

export const revalidate = 300;

const getCachedHomeMeta = unstable_cache(
  async () =>
    getHybridMetaPayload({
      format: HOME_META_FORMAT,
      range: HOME_META_RANGE,
      region: HOME_META_REGION,
    }).catch(() => null),
  ["home-page-meta"],
  { revalidate }
);

const getCachedHomeMatchups = unstable_cache(
  async () =>
    getHybridMatchupPayload({
      format: MATCHUPS_DEFAULT_FORMAT,
      range: MATCHUPS_PAGE_RANGE,
      period: MATCHUPS_DEFAULT_PERIOD,
      limit: MATCHUPS_DEFAULT_LIMIT,
      ranking: "relevance",
      forceMatchIntelV2: true,
    }).catch(() => null),
  ["home-page-matchups"],
  { revalidate }
);

const getCachedHomeBounty = unstable_cache(
  async () =>
    getMarketHomeReadModel({ limit: 12 })
      .then((payload) => toLegacyMarketWatchShape(payload))
      .catch(() => null),
  ["home-page-bounty"],
  { revalidate }
);

export default async function HomePage() {
  const [metaResult, matchupsResult, bountyResult] = await Promise.all([
    getCachedHomeMeta(),
    getCachedHomeMatchups(),
    getCachedHomeBounty(),
  ]);

  const initialMeta = metaResult && !String(metaResult.source || "").toLowerCase().includes("seeded") ? metaResult : null;
  const initialMatchups = matchupsResult && !String(matchupsResult.source || "").toLowerCase().includes("seeded")
    ? ({
        source: matchupsResult.source,
        updatedAt: matchupsResult.updatedAt,
        sampleGames: matchupsResult.sampleGames,
        sampleLabel: matchupsResult.sampleLabel,
        sampleDescription: matchupsResult.sampleDescription,
        comparableSample: matchupsResult.comparableSample,
        decks: matchupsResult.decks,
      } satisfies HomeMatchupPayload)
    : null;
  const bountyState = buildHomeBountyStateFromMarketWatch(bountyResult);

  return (
    <HomePageClient
      initialMeta={initialMeta}
      initialMatchups={initialMatchups}
      initialBountyCards={bountyState.cards}
      initialBountyMeta={bountyState.meta}
      initialPricingPulseUpdatedAt={bountyResult?.pricingPulseUpdatedAt || null}
      initialMetaIsLive={Boolean(initialMeta)}
      initialMatchupsAreLive={Boolean(initialMatchups)}
      initialBountyIsLive={bountyState.isLive}
    />
  );
}
