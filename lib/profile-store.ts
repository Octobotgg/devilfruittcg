"use server";

import "server-only";

import { randomUUID } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getBaseCardId } from "@/lib/card-variants";
import { normalizeCollection, normalizeDecks } from "@/lib/cloud/normalize";
import type { Collection, Deck } from "@/lib/cloud/types";
import { getOfficialCardById, OFFICIAL_BASE_CARDS } from "@/lib/official-cards";
import { buildDeckSummaryPatch, buildProfileSummary } from "@/lib/profile-summary";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_PROFILE_SUMMARY,
  type NotificationPreferences,
  type ProfileActivity,
  type ProfileActivityKind,
  type ProfileFeaturedDeck,
  type ProfilePublicDeck,
  type ProfilePublicDeckCard,
  type ProfileSummary,
  type ProfileVisibility,
  type UserProfileRecord,
} from "@/lib/profile-types";

const PROFILE_METADATA_KEY = "devilfruit_profile";
const SUMMARY_METADATA_KEY = "devilfruit_profile_summary";
const ACTIVITY_METADATA_KEY = "devilfruit_profile_activities";
const SOCIAL_METADATA_KEY = "devilfruit_social";
const USERS_CACHE_TTL_MS = 30_000;
const MAX_ACTIVITY_ITEMS = 60;
const USER_DATA_TABLE = "user_data";

type AuthUserLike = {
  id: string;
  email?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type StoredActivity = ProfileActivity & {
  dedupeKey?: string | null;
};

type SocialMetadata = {
  followingUserIds: string[];
};

type PublicSearchRow = {
  userId: string;
  displayName: string;
  username: string | null;
  avatarKey: string;
  bio: string;
  favoriteLeaderId: string | null;
  updatedAt: string;
};

type UserDataRow = {
  decks?: unknown;
  collection?: unknown;
};

let adminClient: SupabaseClient | null = null;
let cachedUsers: { expiresAt: number; users: AuthUserLike[] } | null = null;
let inflightUsers: Promise<AuthUserLike[]> | null = null;

function cleanEnvValue(value: string | undefined) {
  return String(value || "").replace(/\\n/g, "").trim();
}

function getServerSupabaseConfig() {
  const url = cleanEnvValue(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
  if (!url) throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return { url, serviceRoleKey };
}

function getAdminClient() {
  if (adminClient) return adminClient;
  const cfg = getServerSupabaseConfig();
  adminClient = createClient(cfg.url, cfg.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return adminClient;
}

function profileDisplayName(email: string | null, fullName?: string | null) {
  const trimmedName = String(fullName || "").trim();
  if (trimmedName) return trimmedName;
  const trimmedEmail = String(email || "").trim();
  if (trimmedEmail.includes("@")) return trimmedEmail.split("@")[0];
  return "Pirate";
}

function parseJsonObject<T>(value: unknown, fallback: T): T {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return { ...fallback, ...(parsed as Record<string, unknown>) } as T;
      }
    } catch {
      return fallback;
    }
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  return { ...fallback, ...(value as Record<string, unknown>) } as T;
}

function normalizeNotificationPreferences(value: unknown): NotificationPreferences {
  const raw = parseJsonObject<NotificationPreferences>(value, DEFAULT_NOTIFICATION_PREFERENCES);
  return {
    priceAlerts: Boolean(raw.priceAlerts),
    newSetReleases: Boolean(raw.newSetReleases),
    followerActivity: Boolean(raw.followerActivity),
  };
}

function normalizeFeaturedDeckIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((entry) => String(entry || "").trim())
        .filter(Boolean),
    ),
  ).slice(0, 3);
}

function normalizeProfileSummary(summary: Partial<ProfileSummary> | null | undefined): ProfileSummary {
  const base = {
    ...DEFAULT_PROFILE_SUMMARY,
    ...(summary || {}),
  };

  return {
    uniqueCardsOwned: Math.max(0, Math.trunc(Number(base.uniqueCardsOwned || 0))),
    totalCardsOwned: Math.max(0, Math.trunc(Number(base.totalCardsOwned || 0))),
    collectionValue: Number(Number(base.collectionValue || 0).toFixed(2)),
    setsCompleted: Math.max(0, Math.trunc(Number(base.setsCompleted || 0))),
    completedSetCodes: Array.from(
      new Set((base.completedSetCodes || []).map((code) => String(code).trim().toUpperCase()).filter(Boolean)),
    ),
    topValuableCards: Array.isArray(base.topValuableCards)
      ? base.topValuableCards
          .map((row) => ({
            cardId: String(row.cardId || "").trim().toUpperCase(),
            name: String(row.name || "").trim(),
            imageUrl: row.imageUrl ? String(row.imageUrl) : null,
            price: Number(Number(row.price || 0).toFixed(2)),
            quantity: row.quantity == null ? undefined : Math.max(0, Math.trunc(Number(row.quantity || 0))),
          }))
          .filter((row) => row.cardId && row.name)
          .slice(0, 3)
      : [],
    totalDecksBuilt: Math.max(0, Math.trunc(Number(base.totalDecksBuilt || 0))),
    battleReadyDecks: Math.max(0, Math.trunc(Number(base.battleReadyDecks || 0))),
    favoriteColors: Array.from(new Set((base.favoriteColors || []).map((color) => String(color).trim()).filter(Boolean))).slice(0, 4),
    mostUsedLeader: base.mostUsedLeader?.cardId
      ? {
          cardId: String(base.mostUsedLeader.cardId).trim().toUpperCase(),
          name: String(base.mostUsedLeader.name || "").trim(),
          color: base.mostUsedLeader.color ? String(base.mostUsedLeader.color) : null,
          imageUrl: base.mostUsedLeader.imageUrl ? String(base.mostUsedLeader.imageUrl) : null,
        }
      : null,
    wishlistCount: Math.max(0, Math.trunc(Number(base.wishlistCount || 0))),
    tradeCount: Math.max(0, Math.trunc(Number(base.tradeCount || 0))),
    collectionCards: Array.isArray(base.collectionCards)
      ? base.collectionCards
          .map((entry) => ({
            cardId: String(entry.cardId || "").trim().toUpperCase(),
            quantity: Math.max(0, Math.trunc(Number(entry.quantity || 0))),
          }))
          .filter((entry) => entry.cardId && entry.quantity > 0)
      : [],
    updatedAt: typeof base.updatedAt === "string" && base.updatedAt.trim() ? base.updatedAt : new Date().toISOString(),
  };
}

function normalizeStoredActivities(value: unknown): StoredActivity[] {
  if (!Array.isArray(value)) return [];
  const rows: StoredActivity[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const row = entry as Record<string, unknown>;
    const title = String(row.title || "").trim();
    const detail = String(row.detail || "").trim();
    if (!title || !detail) continue;
    const createdAt =
      typeof row.createdAt === "string" && row.createdAt.trim()
        ? row.createdAt
        : new Date().toISOString();
    rows.push({
      activityId: String(row.activityId || "").trim() || randomUUID(),
      userId: String(row.userId || "").trim(),
      kind: String(row.kind || "collection_add") as ProfileActivityKind,
      title,
      detail,
      cardId: row.cardId ? String(row.cardId).trim().toUpperCase() : null,
      deckId: row.deckId ? String(row.deckId).trim() : null,
      createdAt,
      publicVisible: row.publicVisible !== false,
      dedupeKey: row.dedupeKey ? String(row.dedupeKey).trim() : null,
    });
  }
  return rows
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, MAX_ACTIVITY_ITEMS);
}

function normalizeSocialMetadata(value: unknown): SocialMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { followingUserIds: [] };
  }

  const row = value as Record<string, unknown>;
  const followingUserIds = Array.isArray(row.followingUserIds)
    ? Array.from(
        new Set(
          row.followingUserIds
            .map((item) => String(item || "").trim())
            .filter(Boolean),
        ),
      )
    : [];

  return { followingUserIds };
}

function normalizeProfileRecord(user: AuthUserLike): UserProfileRecord {
  const metadata = user.user_metadata || {};
  const stored = metadata[PROFILE_METADATA_KEY] && typeof metadata[PROFILE_METADATA_KEY] === "object"
    ? (metadata[PROFILE_METADATA_KEY] as Record<string, unknown>)
    : {};
  const fullName =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : null;
  const createdAt = typeof user.created_at === "string" && user.created_at.trim() ? user.created_at : new Date().toISOString();
  const updatedAt =
    typeof stored.updatedAt === "string" && stored.updatedAt.trim()
      ? stored.updatedAt
      : typeof user.updated_at === "string" && user.updated_at.trim()
        ? user.updated_at
        : createdAt;

  return {
    userId: user.id,
    email: user.email ?? null,
    displayName: String(stored.displayName || "").trim() || profileDisplayName(user.email ?? null, fullName),
    username: stored.username ? String(stored.username).trim().toLowerCase() : null,
    avatarKey: String(stored.avatarKey || "straw_hat").trim() || "straw_hat",
    bio: String(stored.bio || "").slice(0, 280),
    favoriteLeaderId: stored.favoriteLeaderId ? String(stored.favoriteLeaderId).trim().toUpperCase() : null,
    profileVisibility: stored.profileVisibility === "private" ? "private" : "public",
    showActivity: stored.showActivity !== false,
    featuredDeckIds: normalizeFeaturedDeckIds(stored.featuredDeckIds),
    memberSince:
      typeof stored.memberSince === "string" && stored.memberSince.trim()
        ? stored.memberSince
        : createdAt,
    updatedAt,
    notificationPreferences: normalizeNotificationPreferences(stored.notificationPreferences),
  };
}

async function fetchAllAuthUsers(force = false): Promise<AuthUserLike[]> {
  if (!force && cachedUsers && cachedUsers.expiresAt > Date.now()) return cachedUsers.users;
  if (!force && inflightUsers) return inflightUsers;

  const task = (async () => {
    const client = getAdminClient();
    const users: AuthUserLike[] = [];
    let page = 1;
    const perPage = 200;

    for (;;) {
      const { data, error } = await client.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const batch = Array.isArray(data?.users) ? (data.users as AuthUserLike[]) : [];
      users.push(...batch);
      if (batch.length < perPage) break;
      page += 1;
    }

    cachedUsers = {
      expiresAt: Date.now() + USERS_CACHE_TTL_MS,
      users,
    };
    inflightUsers = null;
    return users;
  })();

  inflightUsers = task;
  try {
    return await task;
  } finally {
    inflightUsers = null;
  }
}

function invalidateUserCache() {
  cachedUsers = null;
  inflightUsers = null;
}

async function getAuthUserById(userId: string): Promise<AuthUserLike | null> {
  const client = getAdminClient();
  const { data, error } = await client.auth.admin.getUserById(userId);
  if (error || !data.user) return null;
  return data.user as AuthUserLike;
}

async function updateUserMetadata(
  userId: string,
  updater: (current: Record<string, unknown>, user: AuthUserLike) => Record<string, unknown>,
): Promise<AuthUserLike | null> {
  const client = getAdminClient();
  const currentUser = await getAuthUserById(userId);
  if (!currentUser) return null;
  const currentMetadata =
    currentUser.user_metadata && typeof currentUser.user_metadata === "object"
      ? { ...currentUser.user_metadata }
      : {};
  const nextMetadata = updater(currentMetadata, currentUser);
  const { data, error } = await client.auth.admin.updateUserById(userId, { user_metadata: nextMetadata });
  if (error || !data.user) return null;
  invalidateUserCache();
  return data.user as AuthUserLike;
}

async function loadUserDataRow(userId: string): Promise<{ decks: Deck[]; collection: Collection }> {
  const client = getAdminClient();
  const { data } = await client
    .from(USER_DATA_TABLE)
    .select("decks, collection")
    .eq("user_id", userId)
    .maybeSingle<UserDataRow>();

  return {
    decks: normalizeDecks(data?.decks),
    collection: normalizeCollection(data?.collection),
  };
}

async function deriveSummaryFromUserData(userId: string): Promise<ProfileSummary | null> {
  const { decks, collection } = await loadUserDataRow(userId);
  if (!decks.length && !Object.keys(collection).length) return null;
  const summary = buildProfileSummary({
    collection,
    decks,
    watchlistCount: 0,
    tradeCount: 0,
    cards: OFFICIAL_BASE_CARDS,
  });
  if (!summary.collectionValue) {
    const deckPatch = buildDeckSummaryPatch({ decks, cards: OFFICIAL_BASE_CARDS });
    summary.totalDecksBuilt = deckPatch.totalDecksBuilt;
    summary.battleReadyDecks = deckPatch.battleReadyDecks;
    summary.favoriteColors = deckPatch.favoriteColors || [];
    summary.mostUsedLeader = deckPatch.mostUsedLeader || null;
  }
  return summary;
}

function toPublicSearchRow(user: AuthUserLike): PublicSearchRow | null {
  const profile = normalizeProfileRecord(user);
  if (!profile.username || profile.profileVisibility !== "public") return null;
  return {
    userId: profile.userId,
    displayName: profile.displayName,
    username: profile.username,
    avatarKey: profile.avatarKey,
    bio: profile.bio,
    favoriteLeaderId: profile.favoriteLeaderId,
    updatedAt: profile.updatedAt,
  };
}

function normalizeDeckVariantId(cardId: string, variantId?: string | null) {
  const baseId = getBaseCardId(cardId.toUpperCase());
  const nextVariantId = String(variantId || "").trim().toUpperCase();
  if (!nextVariantId || nextVariantId === baseId) return undefined;
  return nextVariantId;
}

function resolveDeckImageId(cardId: string, variantId?: string | null) {
  return normalizeDeckVariantId(cardId, variantId) || getBaseCardId(cardId.toUpperCase());
}

function toProfileFeaturedDeck(deck: Deck): ProfileFeaturedDeck {
  const leaderCard = deck.leaderId ? getOfficialCardById(deck.leaderId) : null;
  const leaderImageId = deck.leaderId ? resolveDeckImageId(deck.leaderId, deck.leaderVariantId) : null;
  const leaderColors = Array.from(
    new Set(
      String(leaderCard?.color || "")
        .split("/")
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  );

  return {
    deckId: deck.id,
    name: deck.name,
    leaderId: deck.leaderId,
    leaderName: leaderCard?.name || null,
    leaderImageId,
    leaderColors,
    mainDeckCount: deck.cards.reduce((sum, entry) => sum + entry.quantity, 0),
    updatedAt: deck.updatedAt,
  };
}

function toProfilePublicDeckCard(entry: Deck["cards"][number]): ProfilePublicDeckCard {
  const baseId = getBaseCardId(entry.cardId.toUpperCase());
  const card = getOfficialCardById(baseId);
  const power = Number(card?.power ?? NaN);

  return {
    cardId: baseId,
    variantId: entry.variantId || null,
    imageCardId: resolveDeckImageId(baseId, entry.variantId),
    quantity: entry.quantity,
    name: card?.name || baseId,
    type: card?.type || "Unknown",
    cost: typeof card?.cost === "number" ? card.cost : Number.isFinite(Number(card?.cost)) ? Number(card?.cost) : null,
    color: String(card?.color || ""),
    set: String(card?.set || ""),
    setCode: String(card?.setCode || ""),
    number: String(card?.number || ""),
    rarity: String(card?.rarity || ""),
    power: Number.isFinite(power) ? power : null,
    attribute: card?.attribute ? String(card.attribute) : null,
    imageUrl: card?.imageUrl || null,
  };
}

function toProfilePublicDeck(deck: Deck, isFeatured: boolean): ProfilePublicDeck {
  const leaderCard = deck.leaderId ? getOfficialCardById(deck.leaderId) : null;
  const leaderImageId = deck.leaderId ? resolveDeckImageId(deck.leaderId, deck.leaderVariantId) : null;
  const leaderColors = Array.from(
    new Set(
      String(leaderCard?.color || "")
        .split("/")
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  );

  return {
    deckId: deck.id,
    name: deck.name,
    leaderId: deck.leaderId,
    leaderVariantId: deck.leaderVariantId ?? null,
    leaderName: leaderCard?.name || null,
    leaderImageId,
    leaderColors,
    mainDeckCount: deck.cards.reduce((sum, entry) => sum + entry.quantity, 0),
    updatedAt: deck.updatedAt,
    isFeatured,
    leaderCard: deck.leaderId
      ? {
          cardId: deck.leaderId,
          variantId: deck.leaderVariantId ?? null,
          imageCardId: leaderImageId || deck.leaderId,
          quantity: 1,
          name: leaderCard?.name || deck.leaderId,
          type: leaderCard?.type || "Leader",
          cost: typeof leaderCard?.cost === "number" ? leaderCard.cost : Number.isFinite(Number(leaderCard?.cost)) ? Number(leaderCard?.cost) : null,
          color: String(leaderCard?.color || ""),
          set: String(leaderCard?.set || ""),
          setCode: String(leaderCard?.setCode || ""),
          number: String(leaderCard?.number || ""),
          rarity: String(leaderCard?.rarity || ""),
          power: Number.isFinite(Number(leaderCard?.power)) ? Number(leaderCard?.power) : null,
          attribute: leaderCard?.attribute ? String(leaderCard.attribute) : null,
          imageUrl: leaderCard?.imageUrl || null,
        }
      : null,
    cards: deck.cards.map((entry) => toProfilePublicDeckCard(entry)),
  };
}

export async function getUserProfileRecord(userId: string): Promise<UserProfileRecord | null> {
  const user = await getAuthUserById(userId);
  return user ? normalizeProfileRecord(user) : null;
}

export async function upsertUserProfileRecord(input: {
  userId: string;
  email?: string | null;
  displayName?: string | null;
  username?: string | null;
  avatarKey?: string | null;
  bio?: string | null;
  favoriteLeaderId?: string | null;
  profileVisibility?: ProfileVisibility;
  showActivity?: boolean;
  featuredDeckIds?: string[];
  notificationPreferences?: NotificationPreferences;
}): Promise<UserProfileRecord | null> {
  const updated = await updateUserMetadata(input.userId, (currentMetadata) => {
    const existingRecord = currentMetadata[PROFILE_METADATA_KEY];
    const existing =
      existingRecord && typeof existingRecord === "object"
        ? {
            ...normalizeProfileRecord({
              id: input.userId,
              email: input.email ?? null,
              user_metadata: { [PROFILE_METADATA_KEY]: existingRecord },
            }),
          }
        : null;
    const fallbackDisplayName = profileDisplayName(input.email ?? null, null);
    const nextProfile = {
      displayName: String(input.displayName ?? existing?.displayName ?? fallbackDisplayName).trim() || fallbackDisplayName,
      username: input.username == null ? existing?.username ?? null : String(input.username || "").trim().toLowerCase() || null,
      avatarKey: String(input.avatarKey ?? existing?.avatarKey ?? "straw_hat").trim() || "straw_hat",
      bio: String(input.bio ?? existing?.bio ?? "").trim().slice(0, 280),
      favoriteLeaderId:
        input.favoriteLeaderId === undefined
          ? existing?.favoriteLeaderId ?? null
          : input.favoriteLeaderId
            ? String(input.favoriteLeaderId).trim().toUpperCase()
            : null,
      profileVisibility: input.profileVisibility || existing?.profileVisibility || "public",
      showActivity: input.showActivity === undefined ? existing?.showActivity ?? true : Boolean(input.showActivity),
      featuredDeckIds:
        input.featuredDeckIds === undefined
          ? existing?.featuredDeckIds ?? []
          : normalizeFeaturedDeckIds(input.featuredDeckIds),
      memberSince: existing?.memberSince || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notificationPreferences: {
        ...(existing?.notificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES),
        ...(input.notificationPreferences || {}),
      },
    };

    return {
      ...currentMetadata,
      [PROFILE_METADATA_KEY]: nextProfile,
    };
  });

  return updated ? normalizeProfileRecord(updated) : null;
}

export async function isUsernameInUse(username: string, excludeUserId?: string): Promise<boolean> {
  const normalized = username.trim().toLowerCase();
  if (!normalized) return false;
  const users = await fetchAllAuthUsers();
  return users.some((user) => {
    if (excludeUserId && user.id === excludeUserId) return false;
    const profile = normalizeProfileRecord(user);
    return profile.username === normalized;
  });
}

export async function getUserProfileByUsernameSupabase(username: string): Promise<UserProfileRecord | null> {
  const normalized = username.trim().toLowerCase();
  if (!normalized) return null;
  const users = await fetchAllAuthUsers();
  const target = users.find((user) => normalizeProfileRecord(user).username === normalized);
  return target ? normalizeProfileRecord(target) : null;
}

export async function getUserDecksSupabase(userId: string): Promise<Deck[]> {
  const { decks } = await loadUserDataRow(userId);
  return decks;
}

export async function sanitizeFeaturedDeckIdsForUserSupabase(userId: string, featuredDeckIds: string[]): Promise<string[]> {
  const validDeckIds = new Set(
    (await getUserDecksSupabase(userId))
      .filter((deck) => deck.visibility === "public")
      .map((deck) => deck.id),
  );

  return normalizeFeaturedDeckIds(featuredDeckIds).filter((deckId) => validDeckIds.has(deckId));
}

export async function listFeaturedProfileDecksSupabase(userId: string): Promise<ProfileFeaturedDeck[]> {
  const profile = await getUserProfileRecord(userId);
  if (!profile?.featuredDeckIds.length) return [];

  const decks = await getUserDecksSupabase(userId);
  const deckMap = new Map(
    decks
      .filter((deck) => deck.visibility === "public")
      .map((deck) => [deck.id, deck] as const),
  );

  return profile.featuredDeckIds
    .map((deckId) => deckMap.get(deckId))
    .filter((deck): deck is Deck => Boolean(deck))
    .map((deck) => toProfileFeaturedDeck(deck))
    .slice(0, 3);
}

export async function listPublicProfileDecksSupabase(userId: string): Promise<ProfilePublicDeck[]> {
  const profile = await getUserProfileRecord(userId);
  if (!profile) return [];

  const featuredSet = new Set(profile.featuredDeckIds);

  return (await getUserDecksSupabase(userId))
    .filter((deck) => deck.visibility === "public")
    .map((deck) => toProfilePublicDeck(deck, featuredSet.has(deck.id)))
    .sort((a, b) => {
      if (Number(b.isFeatured) !== Number(a.isFeatured)) return Number(b.isFeatured) - Number(a.isFeatured);
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    });
}

export async function searchPublicProfilesSupabase(query: string, limit = 12): Promise<PublicSearchRow[]> {
  const normalizedQuery = query.trim().toLowerCase();
  const boundedLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
  const users = await fetchAllAuthUsers();
  const profiles = users
    .map((user) => toPublicSearchRow(user))
    .filter((row): row is PublicSearchRow => Boolean(row));

  if (!normalizedQuery) {
    return profiles
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, boundedLimit);
  }

  return profiles
    .map((row) => {
      const username = String(row.username || "").toLowerCase();
      const displayName = row.displayName.toLowerCase();
      const bio = row.bio.toLowerCase();
      let score = 0;
      if (username === normalizedQuery) score += 1200;
      else if (username.startsWith(normalizedQuery)) score += 900;
      else if (username.includes(normalizedQuery)) score += 700;
      if (displayName === normalizedQuery) score += 1000;
      else if (displayName.startsWith(normalizedQuery)) score += 800;
      else if (displayName.includes(normalizedQuery)) score += 600;
      if (bio.includes(normalizedQuery)) score += 200;
      return { row, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return Date.parse(b.row.updatedAt) - Date.parse(a.row.updatedAt);
    })
    .slice(0, boundedLimit)
    .map((entry) => entry.row);
}

export async function getUserProfileSummarySupabase(userId: string): Promise<ProfileSummary | null> {
  const user = await getAuthUserById(userId);
  if (!user) return null;
  const metadata = user.user_metadata || {};
  const summary = normalizeProfileSummary(metadata[SUMMARY_METADATA_KEY] as Partial<ProfileSummary> | undefined);
  if (
    summary.updatedAt !== DEFAULT_PROFILE_SUMMARY.updatedAt ||
    summary.uniqueCardsOwned > 0 ||
    summary.totalDecksBuilt > 0 ||
    summary.collectionCards.length > 0
  ) {
    return summary;
  }

  return await deriveSummaryFromUserData(userId);
}

export async function upsertUserProfileSummarySupabase(userId: string, patch: Partial<ProfileSummary>): Promise<ProfileSummary | null> {
  const updated = await updateUserMetadata(userId, (currentMetadata) => {
    const existing = normalizeProfileSummary(currentMetadata[SUMMARY_METADATA_KEY] as Partial<ProfileSummary> | undefined);
    const next = normalizeProfileSummary({
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    });

    return {
      ...currentMetadata,
      [SUMMARY_METADATA_KEY]: next,
    };
  });

  if (!updated) return null;
  return normalizeProfileSummary(updated.user_metadata?.[SUMMARY_METADATA_KEY] as Partial<ProfileSummary> | undefined);
}

export async function listUserProfileActivitiesSupabase(
  userId: string,
  options?: { limit?: number; publicOnly?: boolean },
): Promise<ProfileActivity[]> {
  const user = await getAuthUserById(userId);
  if (!user) return [];
  const activities = normalizeStoredActivities(user.user_metadata?.[ACTIVITY_METADATA_KEY]);
  const filtered = options?.publicOnly ? activities.filter((entry) => entry.publicVisible) : activities;
  const limit = Math.max(1, Math.min(200, Math.trunc(options?.limit || 20)));
  return filtered.slice(0, limit);
}

export async function addUserProfileActivitySupabase(input: {
  userId: string;
  kind: ProfileActivityKind;
  title: string;
  detail: string;
  cardId?: string | null;
  deckId?: string | null;
  publicVisible?: boolean;
  dedupeKey?: string | null;
  createdAt?: number;
}): Promise<ProfileActivity | null> {
  const createdAt =
    typeof input.createdAt === "number" && Number.isFinite(input.createdAt)
      ? new Date(input.createdAt).toISOString()
      : new Date().toISOString();

  const updated = await updateUserMetadata(input.userId, (currentMetadata) => {
    const existing = normalizeStoredActivities(currentMetadata[ACTIVITY_METADATA_KEY]);
    const dedupeKey = input.dedupeKey ? input.dedupeKey.trim() : null;

    if (dedupeKey && existing.some((entry) => entry.dedupeKey === dedupeKey)) {
      return currentMetadata;
    }

    const nextEntry: StoredActivity = {
      activityId: randomUUID(),
      userId: input.userId,
      kind: input.kind,
      title: input.title.trim(),
      detail: input.detail.trim(),
      cardId: input.cardId ? input.cardId.trim().toUpperCase() : null,
      deckId: input.deckId ? input.deckId.trim() : null,
      createdAt,
      publicVisible: input.publicVisible !== false,
      dedupeKey,
    };

    const next = [nextEntry, ...existing]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, MAX_ACTIVITY_ITEMS);

    return {
      ...currentMetadata,
      [ACTIVITY_METADATA_KEY]: next,
    };
  });

  if (!updated) return null;
  const activities = normalizeStoredActivities(updated.user_metadata?.[ACTIVITY_METADATA_KEY]);
  return activities[0] || null;
}

function getFollowingIds(user: AuthUserLike | null): string[] {
  return normalizeSocialMetadata(user?.user_metadata?.[SOCIAL_METADATA_KEY]).followingUserIds;
}

export async function isUserFollowingSupabase(followerUserId: string, followeeUserId: string): Promise<boolean> {
  const follower = await getAuthUserById(followerUserId);
  if (!follower) return false;
  return getFollowingIds(follower).includes(followeeUserId);
}

export async function setUserFollowStateSupabase(
  followerUserId: string,
  followeeUserId: string,
  shouldFollow: boolean,
): Promise<boolean> {
  if (!followerUserId || !followeeUserId || followerUserId === followeeUserId) return false;
  const updated = await updateUserMetadata(followerUserId, (currentMetadata) => {
    const social = normalizeSocialMetadata(currentMetadata[SOCIAL_METADATA_KEY]);
    const following = new Set(social.followingUserIds);
    if (shouldFollow) following.add(followeeUserId);
    else following.delete(followeeUserId);

    return {
      ...currentMetadata,
      [SOCIAL_METADATA_KEY]: {
        followingUserIds: Array.from(following),
      },
    };
  });

  return Boolean(updated);
}

export async function getFollowCountsSupabase(userId: string) {
  const users = await fetchAllAuthUsers();
  let followerCount = 0;
  let followingCount = 0;

  for (const user of users) {
    const following = getFollowingIds(user);
    if (user.id === userId) followingCount = following.length;
    if (following.includes(userId)) followerCount += 1;
  }

  return { followerCount, followingCount };
}

export async function listFollowersSupabase(
  userId: string,
  limit = 20,
): Promise<Array<Pick<UserProfileRecord, "userId" | "displayName" | "username" | "avatarKey">>> {
  const users = await fetchAllAuthUsers();
  return users
    .filter((user) => getFollowingIds(user).includes(userId))
    .map((user) => {
      const profile = normalizeProfileRecord(user);
      return {
        userId: profile.userId,
        displayName: profile.displayName,
        username: profile.username,
        avatarKey: profile.avatarKey,
      };
    })
    .slice(0, Math.max(1, Math.min(100, Math.trunc(limit))));
}

export async function listFollowingSupabase(
  userId: string,
  limit = 20,
): Promise<Array<Pick<UserProfileRecord, "userId" | "displayName" | "username" | "avatarKey">>> {
  const users = await fetchAllAuthUsers();
  const byId = new Map(users.map((user) => [user.id, user]));
  const current = users.find((user) => user.id === userId);
  const followingIds = getFollowingIds(current || null);
  const rows = followingIds
    .map((followedId) => byId.get(followedId))
    .filter((user): user is AuthUserLike => Boolean(user))
    .map((user) => {
      const profile = normalizeProfileRecord(user);
      return {
        userId: profile.userId,
        displayName: profile.displayName,
        username: profile.username,
        avatarKey: profile.avatarKey,
      };
    });

  return rows.slice(0, Math.max(1, Math.min(100, Math.trunc(limit))));
}

export async function getCollectionCompareDataSupabase(viewerUserId: string, targetUserId: string) {
  const viewerSummary = (await getUserProfileSummarySupabase(viewerUserId)) || DEFAULT_PROFILE_SUMMARY;
  const targetSummary = (await getUserProfileSummarySupabase(targetUserId)) || DEFAULT_PROFILE_SUMMARY;

  const viewerMap = new Map(viewerSummary.collectionCards.map((entry) => [entry.cardId, entry.quantity]));
  const targetMap = new Map(targetSummary.collectionCards.map((entry) => [entry.cardId, entry.quantity]));

  const bothOwn = Array.from(targetMap.entries())
    .filter(([cardId]) => viewerMap.has(cardId))
    .map(([cardId, quantity]) => ({
      cardId,
      you: viewerMap.get(cardId) || 0,
      them: quantity,
    }));

  const theyHave = Array.from(targetMap.entries())
    .filter(([cardId]) => !viewerMap.has(cardId))
    .map(([cardId, quantity]) => ({ cardId, them: quantity }));

  const youHave = Array.from(viewerMap.entries())
    .filter(([cardId]) => !targetMap.has(cardId))
    .map(([cardId, quantity]) => ({ cardId, you: quantity }));

  return {
    bothOwn,
    theyHave,
    youHave,
    counts: {
      bothOwn: bothOwn.length,
      theyHave: theyHave.length,
      youHave: youHave.length,
    },
  };
}
