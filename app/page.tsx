import type { Metadata } from "next";
import HomePageClient from "@/components/home/HomePageClient";
import type { HomeBountyCard, HomeBountyMeta, HomeMatchupPayload } from "@/components/home/HomePageClient";
import { unstable_cache } from "next/cache";
import { getHybridMatchupPayload, getHybridMetaPayload } from "@/lib/competitive-insights";
import { getGumGumMarketMoves, type GumGumMarketMovesPayload } from "@/lib/gumgum-market-moves";
import {
  HOME_MATCHUP_PERIOD,
  HOME_MATCHUP_RANGE,
  HOME_MATCHUP_SET,
  HOME_META_FORMAT,
  HOME_META_RANGE,
  HOME_META_REGION,
} from "@/lib/constants/page-defaults";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Devil Fruit TCG for One Piece TCG Prices, Meta, and Deck Building",
  description:
    "Track One Piece TCG card prices, meta reports, matchup data, and deck trends with Devil Fruit TCG on DevilFruitTCG.gg.",
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    title: "Devil Fruit TCG for One Piece TCG Prices, Meta, and Deck Building",
    description:
      "Track One Piece TCG card prices, meta reports, matchup data, and deck trends with Devil Fruit TCG on DevilFruitTCG.gg.",
    url: absoluteUrl("/"),
    images: [
      {
        url: absoluteUrl(siteConfig.socialImage),
        width: 1024,
        height: 1024,
        alt: `${siteConfig.name} emblem`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Devil Fruit TCG for One Piece TCG Prices, Meta, and Deck Building",
    description:
      "Track One Piece TCG card prices, meta reports, matchup data, and deck trends with Devil Fruit TCG on DevilFruitTCG.gg.",
    images: [absoluteUrl(siteConfig.socialImage)],
  },
};

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
      set: HOME_MATCHUP_SET,
      range: HOME_MATCHUP_RANGE,
      period: HOME_MATCHUP_PERIOD,
      limit: 12,
    }).catch(() => null),
  ["home-page-matchups"],
  { revalidate }
);

const getCachedHomeBounty = unstable_cache(
  async () => getGumGumMarketMoves().catch(() => null),
  ["home-page-bounty"],
  { revalidate }
);

function normalizeIsoTimestamp(input?: string | null): string | null {
  if (!input || typeof input !== "string") return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  const normalized = trimmed.startsWith("$D") ? trimmed.slice(2) : trimmed;
  const parsedMs = Date.parse(normalized);
  if (!Number.isFinite(parsedMs)) return null;

  return new Date(parsedMs).toISOString();
}

function buildHomeBountyState(payload: GumGumMarketMovesPayload | null): {
  cards: HomeBountyCard[];
  meta: HomeBountyMeta | null;
  isLive: boolean;
} {
  if (!payload) {
    return {
      cards: [],
      meta: { provider: "GumGum", updatedAt: null, stale: true, staleAgeMs: null },
      isLive: false,
    };
  }

  const updatedAt = normalizeIsoTimestamp(payload.updatedAt) || normalizeIsoTimestamp(payload.fetchedAt);
  const staleAgeMs = updatedAt ? Math.max(0, Date.now() - Date.parse(updatedAt)) : null;
  const meta = {
    provider: "GumGum",
    updatedAt,
    stale: Boolean(payload.stale) || !updatedAt,
    staleAgeMs,
  } satisfies HomeBountyMeta;

  const mapped = payload.board.slice(0, 6).map((item) => {
    const productId = String(item?.productId ?? "").trim();
    const cardId = item?.cardId ? String(item.cardId) : undefined;
    const name = String(item?.name || "Unknown Card");
    const displayId = cardId || (productId ? `TCG #${productId}` : "Unknown");
    const href = cardId
      ? `/cards/${encodeURIComponent(cardId)}`
      : productId
        ? `https://www.tcgplayer.com/product/${encodeURIComponent(productId)}`
        : "/market";

    return {
      key: productId || cardId || name,
      name,
      displayId,
      cardId,
      imageUrl: item?.imageUrl ? String(item.imageUrl) : undefined,
      price: Number(item?.price) || 0,
      delta: Number(item?.percent) || 0,
      href,
      external: !cardId && Boolean(productId),
    } satisfies HomeBountyCard;
  });

  const genericNameRx = /^TCG Product\s+\d+$/i;
  const genericRatio = mapped.length
    ? mapped.filter((item) => genericNameRx.test(item.name)).length / mapped.length
    : 1;

  return {
    cards: genericRatio >= 0.5 ? [] : mapped,
    meta,
    isLive: Boolean(updatedAt && mapped.length && genericRatio < 0.5),
  };
}

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
  const bountyState = buildHomeBountyState(bountyResult);

  return (
    <HomePageClient
      initialMeta={initialMeta}
      initialMatchups={initialMatchups}
      initialBountyCards={bountyState.cards}
      initialBountyMeta={bountyState.meta}
      initialMetaIsLive={Boolean(initialMeta)}
      initialMatchupsAreLive={Boolean(initialMatchups)}
      initialBountyIsLive={bountyState.isLive}
    />
  );
}
