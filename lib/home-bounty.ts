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
  justtcgTitle?: string | null;
  imageUrl?: string | null;
  currentPrice?: number | string | null;
  priceChange24h?: number | string | null;
  dailyChangePct?: number | string | null;
};

export type HomeBountyWatchPayload = {
  source?: string | null;
  updatedAt?: string | null;
  pricingPulseUpdatedAt?: string | null;
  bountyBoard?: HomeBountyWatchItem[] | null;
};

export const HOME_BOUNTY_BOARD_LIMIT = 8;

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

export function formatHomeBountyPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
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

function extractMoverDetailLabel(name: string, justtcgTitle?: string | null) {
  const title = String(justtcgTitle || "").trim();
  if (!title) return null;

  const parentheticalGroups = Array.from(title.matchAll(/\(([^)]+)\)/g), (match) => match[1]?.trim()).filter(Boolean);
  if (!parentheticalGroups.length) return null;

  const meaningfulGroups = parentheticalGroups.filter((group) => {
    const normalized = group.toLowerCase();
    if (!normalized) return false;
    if (normalized === name.trim().toLowerCase()) return false;
    if (/^\d+$/u.test(group)) return false;
    return true;
  });

  if (!meaningfulGroups.length) return null;
  return meaningfulGroups.at(-1) || null;
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
    .slice(0, HOME_BOUNTY_BOARD_LIMIT)
    .map((item) => {
      const exactCardId = String(item?.collectibleId || item?.cardId || "").trim();
      const baseCardId = String(item?.cardId || exactCardId).trim();
      const name = String(item?.name || "Unknown Card");
      const detailLabel = extractMoverDetailLabel(name, item?.justtcgTitle);
      return {
        key: String(item?.collectibleId || exactCardId || name),
        name,
        displayId: detailLabel && baseCardId ? `${baseCardId} · ${detailLabel}` : exactCardId,
        cardId: exactCardId,
        imageUrl: `/api/card-image?id=${encodeURIComponent(exactCardId)}`,
        price: Number(item?.currentPrice) || 0,
        delta: Number(item?.priceChange24h) || 0,
        href: `/cards/${encodeURIComponent(exactCardId)}`,
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
