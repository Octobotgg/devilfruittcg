import { getBaseCardId } from "@/lib/card-variants";
import type { Collection, CollectionEntry, Deck, DeckVisibility } from "./types";

function toFiniteNumber(value: unknown): number | null {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

function normalizeVariantId(cardId: string, value: unknown): string | undefined {
  const variantId = String(value || "").trim().toUpperCase();
  if (!variantId) return undefined;
  const baseId = getBaseCardId(cardId.toUpperCase());
  return variantId === baseId ? undefined : variantId;
}

function normalizeDeckCard(card: unknown): Deck["cards"][number] | null {
  if (!card || typeof card !== "object" || Array.isArray(card)) return null;

  const rawCardId = String((card as { cardId?: unknown }).cardId || "").trim().toUpperCase();
  const cardId = getBaseCardId(rawCardId);
  const quantity = Math.max(0, Math.trunc(toFiniteNumber((card as { quantity?: unknown }).quantity) ?? 0));
  const variantId = normalizeVariantId(cardId, (card as { variantId?: unknown }).variantId);

  if (!cardId || quantity <= 0) return null;
  return variantId ? { cardId, quantity, variantId } : { cardId, quantity };
}

export function normalizeDecks(input: unknown): Deck[] {
  if (!Array.isArray(input)) return [];

  return input.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];

    const id = String((item as { id?: unknown }).id || "").trim();
    const name = String((item as { name?: unknown }).name || "").trim() || "Untitled Deck";
    const rawLeaderId = (item as { leaderId?: unknown }).leaderId;
    const leaderId = rawLeaderId == null ? null : getBaseCardId(String(rawLeaderId).trim().toUpperCase()) || null;
    const leaderVariantId = leaderId ? normalizeVariantId(leaderId, (item as { leaderVariantId?: unknown }).leaderVariantId) ?? null : null;
    const visibility = String((item as { visibility?: unknown }).visibility || "").trim().toLowerCase() === "public"
      ? ("public" satisfies DeckVisibility)
      : ("private" satisfies DeckVisibility);
    const cards = Array.isArray((item as { cards?: unknown }).cards)
      ? ((item as { cards?: unknown[] }).cards || []).flatMap((card) => {
          const next = normalizeDeckCard(card);
          return next ? [next] : [];
        })
      : [];
    const createdAt = String((item as { createdAt?: unknown }).createdAt || "").trim() || new Date().toISOString();
    const updatedAt = String((item as { updatedAt?: unknown }).updatedAt || "").trim() || createdAt;

    if (!id) return [];

    return [{ id, name, leaderId, leaderVariantId, visibility, cards, createdAt, updatedAt }];
  });
}

function normalizeCollectionEntry(cardId: string, entry: unknown): CollectionEntry | null {
  if (typeof entry === "number") {
    const quantity = Math.max(0, Math.trunc(entry));
    return quantity > 0 ? { cardId, quantity } : null;
  }

  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;

  const quantity = Math.max(0, Math.trunc(toFiniteNumber((entry as { quantity?: unknown }).quantity) ?? 0));
  if (quantity <= 0) return null;

  const price = toFiniteNumber((entry as { price?: unknown }).price);
  const lastUpdatedRaw = (entry as { lastUpdated?: unknown }).lastUpdated;
  const lastUpdated = typeof lastUpdatedRaw === "string" && lastUpdatedRaw.trim() ? lastUpdatedRaw.trim() : undefined;

  return {
    cardId: String((entry as { cardId?: unknown }).cardId || cardId).trim() || cardId,
    quantity,
    price: price == null ? undefined : price,
    lastUpdated,
  };
}

export function normalizeCollection(input: unknown): Collection {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};

  const next: Collection = {};

  for (const [cardId, value] of Object.entries(input)) {
    const normalized = normalizeCollectionEntry(cardId, value);
    if (normalized) next[cardId] = normalized;
  }

  return next;
}
