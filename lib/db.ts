import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

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

    CREATE INDEX IF NOT EXISTS idx_price_history_card_ts ON price_history(card_id, ts);
  `);

  return db;
}

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export function getCached(cardId: string): object | null {
  try {
    const db = getDb();
    const row = db
      .prepare("SELECT data, updated_at FROM price_cache WHERE card_id = ?")
      .get(cardId) as { data: string; updated_at: number } | undefined;

    if (!row) return null;
    if (Date.now() - row.updated_at > CACHE_TTL) return null;

    return JSON.parse(row.data);
  } catch {
    return null;
  }
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
