import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, "..", "..");
export const CARDS_PATH = path.join(REPO_ROOT, "data", "bandai-en-official-cards.json");
export const DEFAULT_CATALOG_PATH = path.join(REPO_ROOT, ".cache", "justtcg", "one-piece-catalog.latest.json");
export const DEFAULT_MAPPING_STATE_PATH = path.join(REPO_ROOT, ".cache", "justtcg", "mapping-state.json");
export const DEFAULT_MAPPING_REPORT_PATH = path.join(REPO_ROOT, ".cache", "justtcg", "mapping-report.json");
export const JUSTTCG_CARDS_URL = "https://api.justtcg.com/v1/cards";

export function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

export function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function loadJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

export function writeJson(filePath, value) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function readOfficialCards() {
  return JSON.parse(fs.readFileSync(CARDS_PATH, "utf8"));
}

export function supabaseConfigFromEnv() {
  const url = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "").trim();
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

async function postgrestRequest(config, table, { method, rows, onConflict, prefer }) {
  const url = new URL(`${config.url}/rest/v1/${table}`);
  if (onConflict) url.searchParams.set("on_conflict", onConflict);
  const retriableStatuses = new Set([408, 409, 425, 429, 500, 502, 503, 504, 520, 522, 524]);
  const maxRetries = 5;
  const requestTimeoutMs = 20000;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    let timeout;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
      const response = await fetch(url, {
        method,
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${config.key}`,
          "Content-Type": "application/json",
          Prefer: prefer,
        },
        body: JSON.stringify(rows),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        if (retriableStatuses.has(response.status) && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        throw new Error(`Supabase ${method} failed for ${table}: ${response.status} ${body}`);
      }

      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retriable = error instanceof TypeError || /fetch failed|network|timeout|aborted/i.test(message);
      if (!retriable || attempt >= maxRetries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
}

export async function postgrestUpsert(config, table, rows, onConflict) {
  if (!rows.length) return null;
  return postgrestRequest(config, table, {
    method: "POST",
    rows,
    onConflict,
    prefer: "resolution=merge-duplicates,return=minimal",
  });
}

export async function postgrestInsertReturning(config, table, rows) {
  if (!rows.length) return [];
  return postgrestRequest(config, table, {
    method: "POST",
    rows,
    prefer: "return=representation",
  });
}

export async function postgrestInsert(config, table, rows) {
  if (!rows.length) return null;
  return postgrestRequest(config, table, {
    method: "POST",
    rows,
    prefer: "return=minimal",
  });
}

export function inferTcgplayerId(candidate) {
  return candidate?.tcgplayerId || candidate?.tcgplayer_id || candidate?.tcgplayer?.id || null;
}
