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
const OP13_THIRD_ANNIVERSARY_CARD_IDS = [
  "OP13-008",
  "OP13-010",
  "OP13-018",
  "OP13-020",
  "OP13-033",
  "OP13-041",
  "OP13-048",
  "OP13-052",
  "OP13-055",
  "OP13-056",
  "OP13-059",
  "OP13-060",
  "OP13-062",
  "OP13-068",
  "OP13-070",
  "OP13-088",
  "OP13-093",
  "OP13-103",
  "OP13-105",
  "OP13-106",
  "OP13-107",
  "OP13-111",
];

const OFFICIAL_CARD_VARIANT_OVERRIDES = new Map([
  ["OP09-118_p3", { variantType: "parallel", variantLabel: "Wanted Poster", variantSlug: "wanted_poster_op13" }],
  ["OP02-013_p1", { variantType: "parallel", variantLabel: "Parallel", variantSlug: "parallel_op02_print_1" }],
  ["OP06-118_r1", { variantType: "manga", variantLabel: "Manga", variantSlug: "manga_prb01" }],
  ["EB01-001_p1", { variantType: "alt_art", variantLabel: "Alternate Art", variantSlug: "alternate_art_eb01" }],
  ["EB01-021_p1", { variantType: "alt_art", variantLabel: "Alternate Art", variantSlug: "alternate_art_eb01" }],
  ["EB01-057_p1", { variantType: "alt_art", variantLabel: "Alternate Art", variantSlug: "alternate_art_eb01" }],
  ["OP09-004_p2", { variantType: "parallel", variantLabel: "Wanted Poster", variantSlug: "wanted_poster_op09" }],
  ["OP09-051_p2", { variantType: "parallel", variantLabel: "Wanted Poster", variantSlug: "wanted_poster_op09" }],
  ["OP09-119_p2", { variantType: "manga", variantLabel: "Manga", variantSlug: "manga_op09" }],
  ["OP10-119_p1", { variantType: "alt_art", variantLabel: "Alternate Art", variantSlug: "alternate_art_op10_print_1" }],
  ["OP10-119_p2", { variantType: "manga", variantLabel: "Manga", variantSlug: "manga_op10" }],
  ["OP10-119_p3", { variantType: "sp", variantLabel: "SP", variantSlug: "sp_prb02_print_3" }],
  ["OP14-112_p1", { variantType: "alt_art", variantLabel: "Alternate Art", variantSlug: "alternate_art_op14" }],
  ["OP14-112_p2", { variantType: "sp", variantLabel: "SP", variantSlug: "sp_op14_print_2" }],
  ["EB02-061_p3", { variantType: "sp", variantLabel: "SP", variantSlug: "sp_prb02" }],
  ["ST13-011_p1", { variantType: "parallel", variantLabel: "Parallel", variantSlug: "parallel_st13" }],
  ["ST18-004_p1", { variantType: "parallel", variantLabel: "Treasure Rare", variantSlug: "treasure_rare_op09" }],
  ["OP11-058_p1", { variantType: "parallel", variantLabel: "Treasure Rare", variantSlug: "treasure_rare_op13" }],
  ...OP13_THIRD_ANNIVERSARY_CARD_IDS.map((id) => [
    id,
    {
      isVariant: true,
      variantType: "anniversary",
      variantLabel: "3rd Anniversary Tournament",
      variantSlug: "third_anniversary_tournament_op13",
    },
  ]),
  ["OP13-080_p2", { variantType: "parallel", variantLabel: "Parallel", variantSlug: "parallel_op13_print_2" }],
  ["OP13-083_p2", { variantType: "parallel", variantLabel: "Parallel", variantSlug: "parallel_op13_print_2" }],
  ["OP13-084_p2", { variantType: "parallel", variantLabel: "Parallel", variantSlug: "parallel_op13_print_2" }],
  ["OP13-089_p2", { variantType: "parallel", variantLabel: "Parallel", variantSlug: "parallel_op13_print_2" }],
  ["OP13-091_p2", { variantType: "parallel", variantLabel: "Parallel", variantSlug: "parallel_op13_print_2" }],
  ["OP13-118_p2", { variantType: "alt_art", variantLabel: "Super Alternate Art", variantSlug: "super_alternate_art_op13_print_2" }],
  ["OP13-118_p3", { variantType: "alt_art", variantLabel: "Red Super Alternate Art", variantSlug: "red_super_alternate_art_op13_print_3" }],
  ["OP13-118_p4", { variantType: "parallel", variantLabel: "Wanted Poster", variantSlug: "wanted_poster_op13" }],
  ["OP13-119_p2", { variantType: "alt_art", variantLabel: "Super Alternate Art", variantSlug: "super_alternate_art_op13_print_2" }],
  ["OP13-119_p3", { variantType: "alt_art", variantLabel: "Red Super Alternate Art", variantSlug: "red_super_alternate_art_op13_print_3" }],
  ["OP13-119_p4", { variantType: "parallel", variantLabel: "Wanted Poster", variantSlug: "wanted_poster_op13" }],
  ["OP13-120_p2", { variantType: "alt_art", variantLabel: "Super Alternate Art", variantSlug: "super_alternate_art_op13_print_2" }],
  ["OP13-120_p3", { variantType: "alt_art", variantLabel: "Red Super Alternate Art", variantSlug: "red_super_alternate_art_op13_print_3" }],
  ["OP13-120_p4", { variantType: "parallel", variantLabel: "Wanted Poster", variantSlug: "wanted_poster_op13" }],
]);

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

function normalizeOfficialCard(card) {
  const override = OFFICIAL_CARD_VARIANT_OVERRIDES.get(String(card?.id || "").trim());
  if (!override) return card;
  return {
    ...card,
    variantType: override.variantType,
    variantLabel: override.variantLabel,
    variantSlug: override.variantSlug,
  };
}

export function readOfficialCards() {
  return JSON.parse(fs.readFileSync(CARDS_PATH, "utf8")).map(normalizeOfficialCard);
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
