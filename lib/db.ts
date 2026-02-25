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
    db.prepare(
      `INSERT OR REPLACE INTO price_cache (card_id, card_name, data, updated_at) VALUES (?, ?, ?, ?)`
    ).run(cardId, cardName, JSON.stringify(data), Date.now());
  } catch {
    // Cache write failures are non-fatal
  }
}
