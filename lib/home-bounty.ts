export type HomeBountyCard = {
  key: string;
  name: string;
  displayId: string;
  cardId?: string;
  imageUrl?: string;
  price: number;
  delta: number;
  href: string;
  external?: boolean;
};

export type HomeBountyMeta = {
  provider: string;
  updatedAt: string | null;
  stale: boolean;
  staleAgeMs: number | null;
};

export type HomeBountyState = {
  cards: HomeBountyCard[];
  meta: HomeBountyMeta | null;
  isLive: boolean;
};

export type HomeBountyWatchItem = {
  collectibleId?: string | null;
  collectibleKind?: string | null;
  cardId?: string | null;
  name?: string | null;
  imageUrl?: string | null;
  currentPrice?: number | string | null;
  dailyChangePct?: number | string | null;
};

export type HomeBountyWatchPayload = {
  source?: string | null;
  updatedAt?: string | null;
  bountyBoard?: HomeBountyWatchItem[] | null;
};

export function formatHomeBountyDelta(value: number) {
  const amount = Math.abs(Number(value) || 0);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

function normalizeIsoTimestamp(input?: string | null): string | null {
  if (!input || typeof input !== "string") return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  const normalized = trimmed.startsWith("$D") ? trimmed.slice(2) : trimmed;
  const parsedMs = Date.parse(normalized);
  if (!Number.isFinite(parsedMs)) return null;

  return new Date(parsedMs).toISOString();
}

export function buildHomeBountyStateFromMarketWatch(payload: HomeBountyWatchPayload | null): HomeBountyState {
  if (!payload) {
    return {
      cards: [],
      meta: { provider: "Marketplace", updatedAt: null, stale: true, staleAgeMs: null },
      isLive: false,
    };
  }

  const updatedAt = normalizeIsoTimestamp(payload.updatedAt);
  const staleAgeMs = updatedAt ? Math.max(0, Date.now() - Date.parse(updatedAt)) : null;
  const cards = (Array.isArray(payload.bountyBoard) ? payload.bountyBoard : [])
    .filter((item) => String(item?.collectibleKind || "").trim().toLowerCase() === "raw_card")
    .filter((item) => String(item?.cardId || "").trim())
    .slice(0, 6)
    .map((item) => {
      const cardId = String(item?.cardId || "").trim();
      const name = String(item?.name || "Unknown Card");
      return {
        key: String(item?.collectibleId || cardId || name),
        name,
        displayId: cardId,
        cardId,
        imageUrl: item?.imageUrl ? String(item.imageUrl) : undefined,
        price: Number(item?.currentPrice) || 0,
        delta: Number(item?.dailyChangePct) || 0,
        href: `/cards/${encodeURIComponent(cardId)}`,
        external: false,
      } satisfies HomeBountyCard;
    });

  return {
    cards,
    meta: {
      provider: "Marketplace",
      updatedAt,
      stale: !updatedAt,
      staleAgeMs,
    },
    isLive: Boolean(updatedAt && cards.length),
  };
}
