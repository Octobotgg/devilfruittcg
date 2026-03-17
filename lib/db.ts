import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_PROFILE_SUMMARY,
  type NotificationPreferences,
  type ProfileActivity,
  type ProfileActivityKind,
  type ProfileSummary,
  type ProfileVisibility,
  type UserProfileRecord,
} from "@/lib/profile-types";

const DB_PATH = path.join(process.cwd(), ".cache", "devilfruit.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  // Ensure cache dir exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS price_cache (
      card_id TEXT PRIMARY KEY,
      card_name TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id TEXT NOT NULL,
      ts INTEGER NOT NULL,
      ebay_avg REAL,
      tcg_market REAL
    );

    CREATE TABLE IF NOT EXISTS external_snapshots (
      snapshot_key TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_holdings (
      holding_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      card_id TEXT NOT NULL,
      variant_key TEXT NOT NULL DEFAULT 'base',
      quantity INTEGER NOT NULL DEFAULT 0,
      language TEXT NOT NULL DEFAULT 'EN',
      condition_label TEXT NOT NULL DEFAULT 'NM',
      grade_label TEXT,
      avg_buy_price REAL,
      avg_sell_price REAL,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_transactions (
      txn_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      holding_id TEXT,
      card_id TEXT NOT NULL,
      variant_key TEXT NOT NULL DEFAULT 'base',
      txn_type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL,
      fees REAL,
      occurred_at INTEGER NOT NULL,
      note TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_watchlists (
      watch_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      card_id TEXT NOT NULL,
      variant_key TEXT NOT NULL DEFAULT 'base',
      alert_percent REAL,
      target_price REAL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY,
      email TEXT,
      display_name TEXT NOT NULL,
      username TEXT UNIQUE,
      avatar_key TEXT NOT NULL DEFAULT 'straw_hat',
      bio TEXT NOT NULL DEFAULT '',
      favorite_leader_id TEXT,
      profile_visibility TEXT NOT NULL DEFAULT 'public',
      show_activity INTEGER NOT NULL DEFAULT 1,
      notification_preferences TEXT NOT NULL DEFAULT '{}',
      member_since INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_profile_summaries (
      user_id TEXT PRIMARY KEY,
      summary_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_profile_activities (
      activity_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      card_id TEXT,
      deck_id TEXT,
      public_visible INTEGER NOT NULL DEFAULT 1,
      dedupe_key TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_follows (
      follower_user_id TEXT NOT NULL,
      followee_user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (follower_user_id, followee_user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_price_history_card_ts ON price_history(card_id, ts);
    CREATE INDEX IF NOT EXISTS idx_external_snapshots_updated_at ON external_snapshots(updated_at);
    CREATE INDEX IF NOT EXISTS idx_user_holdings_user_card ON user_holdings(user_id, card_id);
    CREATE INDEX IF NOT EXISTS idx_user_transactions_user_time ON user_transactions(user_id, occurred_at DESC);
    CREATE INDEX IF NOT EXISTS idx_user_watchlists_user_enabled ON user_watchlists(user_id, enabled, updated_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_watchlists_unique ON user_watchlists(user_id, card_id, variant_key);
    CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
    CREATE INDEX IF NOT EXISTS idx_user_profiles_visibility ON user_profiles(profile_visibility, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_user_profile_activities_user_time ON user_profile_activities(user_id, created_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profile_activities_dedupe ON user_profile_activities(user_id, dedupe_key);
    CREATE INDEX IF NOT EXISTS idx_user_follows_followee ON user_follows(followee_user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_user_id, created_at DESC);
  `);

  return db;
}

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export type CachedMarketRow<T = object> = {
  data: T;
  updatedAt: number;
  ageMs: number;
};

type MarketCachePayload = {
  lastUpdated?: string;
  ebay?: {
    averagePrice?: number;
    lowestPrice?: number;
    highestPrice?: number;
  };
  tcgplayer?: {
    market?: number | null;
  };
};

export type CachedMarketSummary = {
  cardId: string;
  updatedAt: number;
  ageMs: number;
  stale: boolean;
  averagePrice: number | null;
  lowestPrice: number | null;
  highestPrice: number | null;
  marketPrice: number | null;
};

export function getCachedWithMeta<T = object>(cardId: string): CachedMarketRow<T> | null {
  try {
    const db = getDb();
    const row = db
      .prepare("SELECT data, updated_at FROM price_cache WHERE card_id = ?")
      .get(cardId) as { data: string; updated_at: number } | undefined;

    if (!row) return null;

    const ageMs = Date.now() - row.updated_at;
    if (ageMs > CACHE_TTL) return null;

    return {
      data: JSON.parse(row.data) as T,
      updatedAt: row.updated_at,
      ageMs,
    };
  } catch {
    return null;
  }
}

export function getCached(cardId: string): object | null {
  const row = getCachedWithMeta(cardId);
  return row?.data ?? null;
}

export function setCache(cardId: string, cardName: string, data: object): void {
  try {
    const db = getDb();
    const now = Date.now();
    db.prepare(
      `INSERT OR REPLACE INTO price_cache (card_id, card_name, data, updated_at) VALUES (?, ?, ?, ?)`
    ).run(cardId, cardName, JSON.stringify(data), now);

    const payload = data as {
      ebay?: { averagePrice?: number };
      tcgplayer?: { market?: number | null };
    };
    const ebayAvg = payload?.ebay?.averagePrice;
    const tcgMarket = payload?.tcgplayer?.market;

    db.prepare(
      `INSERT INTO price_history (card_id, ts, ebay_avg, tcg_market) VALUES (?, ?, ?, ?)`
    ).run(cardId, now, typeof ebayAvg === "number" ? ebayAvg : null, typeof tcgMarket === "number" ? tcgMarket : null);
  } catch {
    // Cache write failures are non-fatal
  }
}

export function getPriceHistory(cardId: string, days: number): Array<{ ts: number; ebay_avg: number | null; tcg_market: number | null }> {
  try {
    const db = getDb();
    const from = Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000;
    return db
      .prepare(
        `SELECT ts, ebay_avg, tcg_market
         FROM price_history
         WHERE card_id = ? AND ts >= ?
         ORDER BY ts ASC`
      )
      .all(cardId, from) as Array<{ ts: number; ebay_avg: number | null; tcg_market: number | null }>;
  } catch {
    return [];
  }
}

function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function getCachedMarketSummaries(cardIds: string[]): Record<string, CachedMarketSummary> {
  try {
    const normalizedIds = Array.from(
      new Set(
        cardIds
          .map((cardId) => cardId.trim().toUpperCase())
          .filter(Boolean),
      ),
    );

    if (!normalizedIds.length) return {};

    const db = getDb();
    const placeholders = normalizedIds.map(() => "?").join(", ");
    const rows = db
      .prepare(`SELECT card_id, data, updated_at FROM price_cache WHERE card_id IN (${placeholders})`)
      .all(...normalizedIds) as Array<{ card_id: string; data: string; updated_at: number }>;

    return rows.reduce<Record<string, CachedMarketSummary>>((acc, row) => {
      const payload = JSON.parse(row.data) as MarketCachePayload;
      const payloadUpdatedAt = payload?.lastUpdated ? Date.parse(payload.lastUpdated) : NaN;
      const updatedAt = Number.isFinite(payloadUpdatedAt) ? payloadUpdatedAt : row.updated_at;
      const ageMs = Math.max(0, Date.now() - updatedAt);

      acc[row.card_id.toUpperCase()] = {
        cardId: row.card_id.toUpperCase(),
        updatedAt,
        ageMs,
        stale: ageMs > CACHE_TTL,
        averagePrice: toFiniteNumber(payload?.ebay?.averagePrice),
        lowestPrice: toFiniteNumber(payload?.ebay?.lowestPrice),
        highestPrice: toFiniteNumber(payload?.ebay?.highestPrice),
        marketPrice: toFiniteNumber(payload?.tcgplayer?.market) ?? toFiniteNumber(payload?.ebay?.averagePrice),
      };

      return acc;
    }, {});
  } catch {
    return {};
  }
}

export function getExternalSnapshot<T = unknown>(snapshotKey: string): { data: T; updatedAt: number } | null {
  try {
    const db = getDb();
    const row = db
      .prepare("SELECT data, updated_at FROM external_snapshots WHERE snapshot_key = ?")
      .get(snapshotKey) as { data: string; updated_at: number } | undefined;

    if (!row) return null;

    return {
      data: JSON.parse(row.data) as T,
      updatedAt: row.updated_at,
    };
  } catch {
    return null;
  }
}

export function setExternalSnapshot(snapshotKey: string, data: unknown): void {
  try {
    const db = getDb();
    const now = Date.now();

    db.prepare(
      `INSERT OR REPLACE INTO external_snapshots (snapshot_key, data, updated_at)
       VALUES (?, ?, ?)`
    ).run(snapshotKey, JSON.stringify(data), now);
  } catch {
    // Snapshot write failures are non-fatal
  }
}

export type UserHoldingRecord = {
  holdingId: string;
  userId: string;
  cardId: string;
  variantKey: string;
  quantity: number;
  language: string;
  conditionLabel: string;
  gradeLabel: string | null;
  avgBuyPrice: number | null;
  avgSellPrice: number | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
};

export type UpsertUserHoldingInput = {
  userId: string;
  holdingId?: string;
  cardId: string;
  variantKey?: string;
  quantity: number;
  language?: string;
  conditionLabel?: string;
  gradeLabel?: string | null;
  avgBuyPrice?: number | null;
  avgSellPrice?: number | null;
  notes?: string | null;
};

function mapHoldingRow(row: Record<string, unknown>): UserHoldingRecord {
  return {
    holdingId: String(row.holding_id || ""),
    userId: String(row.user_id || ""),
    cardId: String(row.card_id || ""),
    variantKey: String(row.variant_key || "base"),
    quantity: Number(row.quantity || 0),
    language: String(row.language || "EN"),
    conditionLabel: String(row.condition_label || "NM"),
    gradeLabel: row.grade_label ? String(row.grade_label) : null,
    avgBuyPrice: typeof row.avg_buy_price === "number" ? row.avg_buy_price : row.avg_buy_price === null ? null : Number(row.avg_buy_price ?? null),
    avgSellPrice: typeof row.avg_sell_price === "number" ? row.avg_sell_price : row.avg_sell_price === null ? null : Number(row.avg_sell_price ?? null),
    notes: row.notes ? String(row.notes) : null,
    createdAt: Number(row.created_at || 0),
    updatedAt: Number(row.updated_at || 0),
  };
}

export function listUserHoldings(userId: string): UserHoldingRecord[] {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT holding_id, user_id, card_id, variant_key, quantity, language, condition_label, grade_label,
                avg_buy_price, avg_sell_price, notes, created_at, updated_at
         FROM user_holdings
         WHERE user_id = ?
         ORDER BY updated_at DESC`
      )
      .all(userId) as Record<string, unknown>[];

    return rows.map(mapHoldingRow);
  } catch {
    return [];
  }
}

export function getUserHolding(userId: string, holdingId: string): UserHoldingRecord | null {
  try {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT holding_id, user_id, card_id, variant_key, quantity, language, condition_label, grade_label,
                avg_buy_price, avg_sell_price, notes, created_at, updated_at
         FROM user_holdings
         WHERE user_id = ? AND holding_id = ?`
      )
      .get(userId, holdingId) as Record<string, unknown> | undefined;

    if (!row) return null;
    return mapHoldingRow(row);
  } catch {
    return null;
  }
}

export function upsertUserHolding(input: UpsertUserHoldingInput): UserHoldingRecord | null {
  try {
    const db = getDb();
    const now = Date.now();

    const normalizedUserId = input.userId.trim();
    const normalizedCardId = input.cardId.trim().toUpperCase();
    if (!normalizedUserId || !normalizedCardId) return null;

    const providedHoldingId = input.holdingId?.trim() || "";
    let holdingId = providedHoldingId;

    if (holdingId) {
      const ownedByUser = db
        .prepare("SELECT holding_id FROM user_holdings WHERE holding_id = ? AND user_id = ?")
        .get(holdingId, normalizedUserId) as { holding_id: string } | undefined;

      if (!ownedByUser) {
        holdingId = randomUUID();
      }
    } else {
      holdingId = randomUUID();
    }

    const quantity = Math.max(0, Math.floor(Number(input.quantity) || 0));
    const variantKey = (input.variantKey || "base").trim() || "base";
    const language = (input.language || "EN").trim() || "EN";
    const conditionLabel = (input.conditionLabel || "NM").trim() || "NM";
    const gradeLabel = input.gradeLabel ? input.gradeLabel.trim() : null;
    const avgBuyPrice = typeof input.avgBuyPrice === "number" && Number.isFinite(input.avgBuyPrice) ? input.avgBuyPrice : null;
    const avgSellPrice = typeof input.avgSellPrice === "number" && Number.isFinite(input.avgSellPrice) ? input.avgSellPrice : null;
    const notes = input.notes ? input.notes.trim() : null;

    const existing = db
      .prepare("SELECT holding_id, created_at FROM user_holdings WHERE holding_id = ? AND user_id = ?")
      .get(holdingId, normalizedUserId) as { holding_id: string; created_at: number } | undefined;

    if (existing) {
      db.prepare(
        `UPDATE user_holdings
         SET card_id = ?, variant_key = ?, quantity = ?, language = ?, condition_label = ?, grade_label = ?,
             avg_buy_price = ?, avg_sell_price = ?, notes = ?, updated_at = ?
         WHERE holding_id = ? AND user_id = ?`
      ).run(
        normalizedCardId,
        variantKey,
        quantity,
        language,
        conditionLabel,
        gradeLabel,
        avgBuyPrice,
        avgSellPrice,
        notes,
        now,
        holdingId,
        normalizedUserId
      );
    } else {
      db.prepare(
        `INSERT INTO user_holdings (
          holding_id, user_id, card_id, variant_key, quantity, language, condition_label, grade_label,
          avg_buy_price, avg_sell_price, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        holdingId,
        normalizedUserId,
        normalizedCardId,
        variantKey,
        quantity,
        language,
        conditionLabel,
        gradeLabel,
        avgBuyPrice,
        avgSellPrice,
        notes,
        now,
        now
      );
    }

    return getUserHolding(normalizedUserId, holdingId);
  } catch {
    return null;
  }
}

export function deleteUserHolding(userId: string, holdingId: string): boolean {
  try {
    const db = getDb();
    const result = db
      .prepare("DELETE FROM user_holdings WHERE user_id = ? AND holding_id = ?")
      .run(userId, holdingId);

    return result.changes > 0;
  } catch {
    return false;
  }
}

export type UserWatchlistRecord = {
  watchId: string;
  userId: string;
  cardId: string;
  variantKey: string;
  alertPercent: number | null;
  targetPrice: number | null;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
};

export function listUserWatchlist(userId: string): UserWatchlistRecord[] {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT watch_id, user_id, card_id, variant_key, alert_percent, target_price, enabled, created_at, updated_at
         FROM user_watchlists
         WHERE user_id = ?
         ORDER BY updated_at DESC`
      )
      .all(userId) as Record<string, unknown>[];

    return rows.map((row) => ({
      watchId: String(row.watch_id || ""),
      userId: String(row.user_id || ""),
      cardId: String(row.card_id || ""),
      variantKey: String(row.variant_key || "base"),
      alertPercent: typeof row.alert_percent === "number" ? row.alert_percent : row.alert_percent === null ? null : Number(row.alert_percent ?? null),
      targetPrice: typeof row.target_price === "number" ? row.target_price : row.target_price === null ? null : Number(row.target_price ?? null),
      enabled: Number(row.enabled || 0) === 1,
      createdAt: Number(row.created_at || 0),
      updatedAt: Number(row.updated_at || 0),
    }));
  } catch {
    return [];
  }
}

export function upsertWatchlistItem(input: {
  userId: string;
  cardId: string;
  variantKey?: string;
  alertPercent?: number | null;
  targetPrice?: number | null;
  enabled?: boolean;
}): UserWatchlistRecord | null {
  try {
    const db = getDb();
    const now = Date.now();

    const userId = input.userId.trim();
    const cardId = input.cardId.trim().toUpperCase();
    const variantKey = (input.variantKey || "base").trim() || "base";
    if (!userId || !cardId) return null;

    const existing = db
      .prepare(
        `SELECT watch_id, created_at
         FROM user_watchlists
         WHERE user_id = ? AND card_id = ? AND variant_key = ?`
      )
      .get(userId, cardId, variantKey) as { watch_id: string; created_at: number } | undefined;

    const alertPercent = typeof input.alertPercent === "number" && Number.isFinite(input.alertPercent) ? input.alertPercent : null;
    const targetPrice = typeof input.targetPrice === "number" && Number.isFinite(input.targetPrice) ? input.targetPrice : null;
    const enabled = input.enabled === undefined ? true : Boolean(input.enabled);

    const watchId = existing?.watch_id || randomUUID();

    if (existing) {
      db.prepare(
        `UPDATE user_watchlists
         SET alert_percent = ?, target_price = ?, enabled = ?, updated_at = ?
         WHERE watch_id = ?`
      ).run(alertPercent, targetPrice, enabled ? 1 : 0, now, watchId);
    } else {
      db.prepare(
        `INSERT INTO user_watchlists (
          watch_id, user_id, card_id, variant_key, alert_percent, target_price, enabled, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(watchId, userId, cardId, variantKey, alertPercent, targetPrice, enabled ? 1 : 0, now, now);
    }

    const row = db
      .prepare(
        `SELECT watch_id, user_id, card_id, variant_key, alert_percent, target_price, enabled, created_at, updated_at
         FROM user_watchlists
         WHERE watch_id = ?`
      )
      .get(watchId) as Record<string, unknown> | undefined;

    if (!row) return null;

    return {
      watchId: String(row.watch_id || ""),
      userId: String(row.user_id || ""),
      cardId: String(row.card_id || ""),
      variantKey: String(row.variant_key || "base"),
      alertPercent: typeof row.alert_percent === "number" ? row.alert_percent : row.alert_percent === null ? null : Number(row.alert_percent ?? null),
      targetPrice: typeof row.target_price === "number" ? row.target_price : row.target_price === null ? null : Number(row.target_price ?? null),
      enabled: Number(row.enabled || 0) === 1,
      createdAt: Number(row.created_at || 0),
      updatedAt: Number(row.updated_at || 0),
    };
  } catch {
    return null;
  }
}

export function deleteWatchlistItem(userId: string, watchId: string): boolean {
  try {
    const db = getDb();
    const result = db
      .prepare("DELETE FROM user_watchlists WHERE user_id = ? AND watch_id = ?")
      .run(userId, watchId);

    return result.changes > 0;
  } catch {
    return false;
  }
}

export type UserTransactionRecord = {
  txnId: string;
  userId: string;
  holdingId: string | null;
  cardId: string;
  variantKey: string;
  txnType: "buy" | "sell" | "adjust";
  quantity: number;
  unitPrice: number | null;
  fees: number | null;
  occurredAt: number;
  note: string | null;
  createdAt: number;
};

export function addUserTransaction(input: {
  userId: string;
  holdingId?: string | null;
  cardId: string;
  variantKey?: string;
  txnType: "buy" | "sell" | "adjust";
  quantity: number;
  unitPrice?: number | null;
  fees?: number | null;
  occurredAt?: number;
  note?: string | null;
}): UserTransactionRecord | null {
  try {
    const db = getDb();
    const now = Date.now();

    const txnId = randomUUID();
    const userId = input.userId.trim();
    const cardId = input.cardId.trim().toUpperCase();
    const variantKey = (input.variantKey || "base").trim() || "base";
    if (!userId || !cardId) return null;

    const quantity = Math.trunc(Number(input.quantity) || 0);
    if (quantity === 0) return null;

    const unitPrice = typeof input.unitPrice === "number" && Number.isFinite(input.unitPrice) ? input.unitPrice : null;
    const fees = typeof input.fees === "number" && Number.isFinite(input.fees) ? input.fees : null;
    const occurredAt = typeof input.occurredAt === "number" && Number.isFinite(input.occurredAt) ? input.occurredAt : now;
    const note = input.note ? input.note.trim() : null;

    db.prepare(
      `INSERT INTO user_transactions (
        txn_id, user_id, holding_id, card_id, variant_key, txn_type, quantity, unit_price, fees, occurred_at, note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(txnId, userId, input.holdingId || null, cardId, variantKey, input.txnType, quantity, unitPrice, fees, occurredAt, note, now);

    return {
      txnId,
      userId,
      holdingId: input.holdingId || null,
      cardId,
      variantKey,
      txnType: input.txnType,
      quantity,
      unitPrice,
      fees,
      occurredAt,
      note,
      createdAt: now,
    };
  } catch {
    return null;
  }
}

export function listUserTransactions(userId: string, limit = 100): UserTransactionRecord[] {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT txn_id, user_id, holding_id, card_id, variant_key, txn_type, quantity, unit_price, fees, occurred_at, note, created_at
         FROM user_transactions
         WHERE user_id = ?
         ORDER BY occurred_at DESC, created_at DESC
         LIMIT ?`
      )
      .all(userId, Math.max(1, Math.min(500, Math.floor(limit)))) as Record<string, unknown>[];

    return rows.map((row) => ({
      txnId: String(row.txn_id || ""),
      userId: String(row.user_id || ""),
      holdingId: row.holding_id ? String(row.holding_id) : null,
      cardId: String(row.card_id || ""),
      variantKey: String(row.variant_key || "base"),
      txnType: String(row.txn_type || "adjust") as "buy" | "sell" | "adjust",
      quantity: Number(row.quantity || 0),
      unitPrice: typeof row.unit_price === "number" ? row.unit_price : row.unit_price === null ? null : Number(row.unit_price ?? null),
      fees: typeof row.fees === "number" ? row.fees : row.fees === null ? null : Number(row.fees ?? null),
      occurredAt: Number(row.occurred_at || 0),
      note: row.note ? String(row.note) : null,
      createdAt: Number(row.created_at || 0),
    }));
  } catch {
    return [];
  }
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function profileDisplayName(email: string | null, fullName?: string | null) {
  const trimmedName = String(fullName || "").trim();
  if (trimmedName) return trimmedName;
  const trimmedEmail = String(email || "").trim();
  if (trimmedEmail.includes("@")) return trimmedEmail.split("@")[0];
  return "Pirate";
}

function mapProfileRow(row: Record<string, unknown>, email: string | null, fullName?: string | null): UserProfileRecord {
  const preferences = parseJson<NotificationPreferences>(row.notification_preferences, DEFAULT_NOTIFICATION_PREFERENCES);

  return {
    userId: String(row.user_id || ""),
    email: row.email == null ? email : String(row.email || ""),
    displayName: String(row.display_name || profileDisplayName(email, fullName)),
    username: row.username ? String(row.username) : null,
    avatarKey: String(row.avatar_key || "straw_hat"),
    bio: String(row.bio || ""),
    favoriteLeaderId: row.favorite_leader_id ? String(row.favorite_leader_id) : null,
    profileVisibility: String(row.profile_visibility || "public") === "private" ? "private" : "public",
    showActivity: Number(row.show_activity || 0) === 1,
    featuredDeckIds: [],
    memberSince: new Date(Number(row.member_since || Date.now())).toISOString(),
    updatedAt: new Date(Number(row.updated_at || Date.now())).toISOString(),
    notificationPreferences: {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...preferences,
    },
  };
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
    completedSetCodes: Array.from(new Set((base.completedSetCodes || []).map((code) => String(code).trim().toUpperCase()).filter(Boolean))),
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

function mapActivityRow(row: Record<string, unknown>): ProfileActivity {
  return {
    activityId: String(row.activity_id || ""),
    userId: String(row.user_id || ""),
    kind: String(row.kind || "collection_add") as ProfileActivityKind,
    title: String(row.title || ""),
    detail: String(row.detail || ""),
    cardId: row.card_id ? String(row.card_id) : null,
    deckId: row.deck_id ? String(row.deck_id) : null,
    createdAt: new Date(Number(row.created_at || Date.now())).toISOString(),
    publicVisible: Number(row.public_visible || 0) === 1,
  };
}

export function getUserProfile(userId: string, email: string | null = null, fullName?: string | null): UserProfileRecord {
  try {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT user_id, email, display_name, username, avatar_key, bio, favorite_leader_id, profile_visibility,
                show_activity, notification_preferences, member_since, updated_at
         FROM user_profiles
         WHERE user_id = ?`
      )
      .get(userId) as Record<string, unknown> | undefined;

    if (!row) {
      const nowIso = new Date().toISOString();
      return {
        userId,
        email,
        displayName: profileDisplayName(email, fullName),
        username: null,
        avatarKey: "straw_hat",
        bio: "",
        favoriteLeaderId: null,
        profileVisibility: "public",
        showActivity: true,
        featuredDeckIds: [],
        memberSince: nowIso,
        updatedAt: nowIso,
        notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
      };
    }

    return mapProfileRow(row, email, fullName);
  } catch {
    const nowIso = new Date().toISOString();
    return {
      userId,
      email,
      displayName: profileDisplayName(email, fullName),
      username: null,
      avatarKey: "straw_hat",
      bio: "",
      favoriteLeaderId: null,
      profileVisibility: "public",
      showActivity: true,
      featuredDeckIds: [],
      memberSince: nowIso,
      updatedAt: nowIso,
      notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
    };
  }
}

export function getUserProfileByUsername(username: string): UserProfileRecord | null {
  try {
    const db = getDb();
    const normalized = username.trim().toLowerCase();
    if (!normalized) return null;
    const row = db
      .prepare(
        `SELECT user_id, email, display_name, username, avatar_key, bio, favorite_leader_id, profile_visibility,
                show_activity, notification_preferences, member_since, updated_at
         FROM user_profiles
         WHERE username = ?`
      )
      .get(normalized) as Record<string, unknown> | undefined;

    if (!row) return null;
    return mapProfileRow(row, row.email ? String(row.email) : null);
  } catch {
    return null;
  }
}

export function usernameInUse(username: string, excludeUserId?: string): boolean {
  try {
    const db = getDb();
    const normalized = username.trim().toLowerCase();
    if (!normalized) return false;

    const row = excludeUserId
      ? (db
          .prepare("SELECT user_id FROM user_profiles WHERE username = ? AND user_id <> ?")
          .get(normalized, excludeUserId) as { user_id: string } | undefined)
      : (db
          .prepare("SELECT user_id FROM user_profiles WHERE username = ?")
          .get(normalized) as { user_id: string } | undefined);

    return Boolean(row?.user_id);
  } catch {
    return false;
  }
}

export function upsertUserProfile(input: {
  userId: string;
  email?: string | null;
  displayName?: string | null;
  username?: string | null;
  avatarKey?: string | null;
  bio?: string | null;
  favoriteLeaderId?: string | null;
  profileVisibility?: ProfileVisibility;
  showActivity?: boolean;
  notificationPreferences?: NotificationPreferences;
}): UserProfileRecord | null {
  try {
    const db = getDb();
    const now = Date.now();
    const existing = getUserProfile(input.userId, input.email || null, input.displayName || null);

    const displayName = String(input.displayName ?? existing.displayName).trim() || profileDisplayName(input.email ?? existing.email, existing.displayName);
    const username = input.username == null ? existing.username : (String(input.username).trim().toLowerCase() || null);
    const avatarKey = String(input.avatarKey ?? existing.avatarKey).trim() || "straw_hat";
    const bio = String(input.bio ?? existing.bio).trim().slice(0, 280);
    const favoriteLeaderId = input.favoriteLeaderId === undefined ? existing.favoriteLeaderId : input.favoriteLeaderId ? String(input.favoriteLeaderId).trim().toUpperCase() : null;
    const profileVisibility = input.profileVisibility || existing.profileVisibility;
    const showActivity = input.showActivity === undefined ? existing.showActivity : Boolean(input.showActivity);
    const preferences = {
      ...existing.notificationPreferences,
      ...(input.notificationPreferences || {}),
    };

    db.prepare(
      `INSERT INTO user_profiles (
        user_id, email, display_name, username, avatar_key, bio, favorite_leader_id, profile_visibility,
        show_activity, notification_preferences, member_since, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        email = excluded.email,
        display_name = excluded.display_name,
        username = excluded.username,
        avatar_key = excluded.avatar_key,
        bio = excluded.bio,
        favorite_leader_id = excluded.favorite_leader_id,
        profile_visibility = excluded.profile_visibility,
        show_activity = excluded.show_activity,
        notification_preferences = excluded.notification_preferences,
        updated_at = excluded.updated_at`
    ).run(
      input.userId,
      input.email ?? existing.email,
      displayName,
      username,
      avatarKey,
      bio,
      favoriteLeaderId,
      profileVisibility,
      showActivity ? 1 : 0,
      JSON.stringify(preferences),
      Date.parse(existing.memberSince) || now,
      now,
    );

    return getUserProfile(input.userId, input.email ?? existing.email);
  } catch {
    return null;
  }
}

export function getUserProfileSummary(userId: string): ProfileSummary | null {
  try {
    const db = getDb();
    const row = db
      .prepare("SELECT summary_json FROM user_profile_summaries WHERE user_id = ?")
      .get(userId) as { summary_json: string } | undefined;

    if (!row) return null;
    return normalizeProfileSummary(parseJson<ProfileSummary>(row.summary_json, DEFAULT_PROFILE_SUMMARY));
  } catch {
    return null;
  }
}

export function upsertUserProfileSummary(userId: string, patch: Partial<ProfileSummary>): ProfileSummary | null {
  try {
    const db = getDb();
    const existing = getUserProfileSummary(userId) || DEFAULT_PROFILE_SUMMARY;
    const next = normalizeProfileSummary({
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    });

    db.prepare(
      `INSERT INTO user_profile_summaries (user_id, summary_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET summary_json = excluded.summary_json, updated_at = excluded.updated_at`
    ).run(userId, JSON.stringify(next), Date.now());

    return next;
  } catch {
    return null;
  }
}

export function addUserProfileActivity(input: {
  userId: string;
  kind: ProfileActivityKind;
  title: string;
  detail: string;
  cardId?: string | null;
  deckId?: string | null;
  publicVisible?: boolean;
  dedupeKey?: string | null;
  createdAt?: number;
}): ProfileActivity | null {
  try {
    const db = getDb();
    const activityId = randomUUID();
    const now = typeof input.createdAt === "number" && Number.isFinite(input.createdAt) ? input.createdAt : Date.now();

    db.prepare(
      `INSERT OR IGNORE INTO user_profile_activities (
        activity_id, user_id, kind, title, detail, card_id, deck_id, public_visible, dedupe_key, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      activityId,
      input.userId,
      input.kind,
      input.title,
      input.detail,
      input.cardId ? input.cardId.trim().toUpperCase() : null,
      input.deckId ? input.deckId.trim() : null,
      input.publicVisible === false ? 0 : 1,
      input.dedupeKey ? input.dedupeKey.trim() : null,
      now,
    );

    const row = db
      .prepare(
        `SELECT activity_id, user_id, kind, title, detail, card_id, deck_id, public_visible, created_at
         FROM user_profile_activities
         WHERE user_id = ? AND (activity_id = ? OR dedupe_key = ?)
         ORDER BY created_at DESC
         LIMIT 1`
      )
      .get(input.userId, activityId, input.dedupeKey ? input.dedupeKey.trim() : null) as Record<string, unknown> | undefined;

    return row ? mapActivityRow(row) : null;
  } catch {
    return null;
  }
}

export function listUserProfileActivities(userId: string, options?: { limit?: number; publicOnly?: boolean }): ProfileActivity[] {
  try {
    const db = getDb();
    const limit = Math.max(1, Math.min(200, Math.trunc(options?.limit || 20)));
    const rows = options?.publicOnly
      ? (db
          .prepare(
            `SELECT activity_id, user_id, kind, title, detail, card_id, deck_id, public_visible, created_at
             FROM user_profile_activities
             WHERE user_id = ? AND public_visible = 1
             ORDER BY created_at DESC
             LIMIT ?`
          )
          .all(userId, limit) as Record<string, unknown>[])
      : (db
          .prepare(
            `SELECT activity_id, user_id, kind, title, detail, card_id, deck_id, public_visible, created_at
             FROM user_profile_activities
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT ?`
          )
          .all(userId, limit) as Record<string, unknown>[]);

    return rows.map(mapActivityRow);
  } catch {
    return [];
  }
}

export function getFollowCounts(userId: string) {
  try {
    const db = getDb();
    const followerCount = Number(
      (db.prepare("SELECT COUNT(*) AS count FROM user_follows WHERE followee_user_id = ?").get(userId) as { count: number } | undefined)?.count || 0,
    );
    const followingCount = Number(
      (db.prepare("SELECT COUNT(*) AS count FROM user_follows WHERE follower_user_id = ?").get(userId) as { count: number } | undefined)?.count || 0,
    );

    return { followerCount, followingCount };
  } catch {
    return { followerCount: 0, followingCount: 0 };
  }
}

export function isUserFollowing(followerUserId: string, followeeUserId: string) {
  try {
    const db = getDb();
    const row = db
      .prepare("SELECT 1 FROM user_follows WHERE follower_user_id = ? AND followee_user_id = ?")
      .get(followerUserId, followeeUserId) as { 1: number } | undefined;
    return Boolean(row);
  } catch {
    return false;
  }
}

export function setUserFollowState(followerUserId: string, followeeUserId: string, shouldFollow: boolean) {
  try {
    const db = getDb();
    if (!followerUserId || !followeeUserId || followerUserId === followeeUserId) return false;

    if (shouldFollow) {
      db.prepare(
        `INSERT OR IGNORE INTO user_follows (follower_user_id, followee_user_id, created_at)
         VALUES (?, ?, ?)`
      ).run(followerUserId, followeeUserId, Date.now());
    } else {
      db.prepare(
        `DELETE FROM user_follows
         WHERE follower_user_id = ? AND followee_user_id = ?`
      ).run(followerUserId, followeeUserId);
    }

    return true;
  } catch {
    return false;
  }
}

export function listFollowers(userId: string, limit = 20): Array<Pick<UserProfileRecord, "userId" | "displayName" | "username" | "avatarKey">> {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT p.user_id, p.display_name, p.username, p.avatar_key
         FROM user_follows f
         JOIN user_profiles p ON p.user_id = f.follower_user_id
         WHERE f.followee_user_id = ?
         ORDER BY f.created_at DESC
         LIMIT ?`
      )
      .all(userId, Math.max(1, Math.min(100, Math.trunc(limit)))) as Record<string, unknown>[];

    return rows.map((row) => ({
      userId: String(row.user_id || ""),
      displayName: String(row.display_name || "Pirate"),
      username: row.username ? String(row.username) : null,
      avatarKey: String(row.avatar_key || "straw_hat"),
    }));
  } catch {
    return [];
  }
}

export function listFollowing(userId: string, limit = 20): Array<Pick<UserProfileRecord, "userId" | "displayName" | "username" | "avatarKey">> {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT p.user_id, p.display_name, p.username, p.avatar_key
         FROM user_follows f
         JOIN user_profiles p ON p.user_id = f.followee_user_id
         WHERE f.follower_user_id = ?
         ORDER BY f.created_at DESC
         LIMIT ?`
      )
      .all(userId, Math.max(1, Math.min(100, Math.trunc(limit)))) as Record<string, unknown>[];

    return rows.map((row) => ({
      userId: String(row.user_id || ""),
      displayName: String(row.display_name || "Pirate"),
      username: row.username ? String(row.username) : null,
      avatarKey: String(row.avatar_key || "straw_hat"),
    }));
  } catch {
    return [];
  }
}

export function searchPublicProfiles(query: string, limit = 12) {
  try {
    const db = getDb();
    const trimmed = query.trim().toLowerCase();
    const boundedLimit = Math.max(1, Math.min(50, Math.trunc(limit)));

    const rows = trimmed
      ? (db
          .prepare(
            `SELECT user_id, display_name, username, avatar_key, bio, favorite_leader_id, updated_at
             FROM user_profiles
             WHERE profile_visibility = 'public'
               AND username IS NOT NULL
               AND (username LIKE ? OR lower(display_name) LIKE ?)
             ORDER BY updated_at DESC
             LIMIT ?`
          )
          .all(`%${trimmed}%`, `%${trimmed}%`, boundedLimit) as Record<string, unknown>[])
      : (db
          .prepare(
            `SELECT user_id, display_name, username, avatar_key, bio, favorite_leader_id, updated_at
             FROM user_profiles
             WHERE profile_visibility = 'public'
               AND username IS NOT NULL
             ORDER BY updated_at DESC
             LIMIT ?`
          )
          .all(boundedLimit) as Record<string, unknown>[]);

    return rows.map((row) => ({
      userId: String(row.user_id || ""),
      displayName: String(row.display_name || "Pirate"),
      username: row.username ? String(row.username) : null,
      avatarKey: String(row.avatar_key || "straw_hat"),
      bio: String(row.bio || ""),
      favoriteLeaderId: row.favorite_leader_id ? String(row.favorite_leader_id) : null,
      updatedAt: new Date(Number(row.updated_at || Date.now())).toISOString(),
    }));
  } catch {
    return [];
  }
}

export function deleteUserProfileData(userId: string) {
  try {
    const db = getDb();
    db.prepare("DELETE FROM user_profile_summaries WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM user_profile_activities WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM user_follows WHERE follower_user_id = ? OR followee_user_id = ?").run(userId, userId);
    db.prepare("DELETE FROM user_profiles WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM user_holdings WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM user_transactions WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM user_watchlists WHERE user_id = ?").run(userId);
    return true;
  } catch {
    return false;
  }
}
