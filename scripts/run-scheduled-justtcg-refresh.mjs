#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildScheduledRefreshQueue, loadPricingRefreshConfig } from "./lib/justtcg-refresh-queue.mjs";
import { loadJson, readOfficialCards, writeJson, REPO_ROOT } from "./lib/justtcg-utils.mjs";
import { runSetRefresh, resolveSetRefreshTarget } from "./run-justtcg-set-refresh.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OFFICIAL_RELEASES_PATH = path.join(ROOT, "data", "bandai-en-official-releases.json");
const DEFAULT_REFRESH_STATE_PATH = path.join(ROOT, ".cache", "justtcg", "refresh-state.json");
const DEFAULT_FETCH_PAGE_SIZE = 20;
const DEFAULT_MINIMUM_ROLLING_BUDGET = 150;
const BOOSTER_RELEASE_CATEGORIES = new Set(["BOOSTER_PACK", "EXTRA_BOOSTER", "BOOSTER_BOX"]);

function normalizeToken(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function normalizeReleaseCode(value) {
  const normalized = normalizeToken(value);
  if (/^OP\d{2}EB\d{2}$/.test(normalized)) {
    return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
  }
  return normalized;
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    quotaRemaining: null,
    minimumRollingBudget: DEFAULT_MINIMUM_ROLLING_BUDGET,
    statePath: DEFAULT_REFRESH_STATE_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (token === "--quota-remaining") {
      const parsed = Number.parseInt(String(argv[index + 1] || ""), 10);
      args.quotaRemaining = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      index += 1;
      continue;
    }
    if (token === "--minimum-rolling-budget") {
      const parsed = Number.parseInt(String(argv[index + 1] || ""), 10);
      args.minimumRollingBudget = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MINIMUM_ROLLING_BUDGET;
      index += 1;
      continue;
    }
    if (token === "--state-path") {
      args.statePath = argv[index + 1]
        ? path.resolve(process.cwd(), argv[index + 1])
        : args.statePath;
      index += 1;
    }
  }

  return args;
}

function isBoosterRelease(release) {
  return BOOSTER_RELEASE_CATEGORIES.has(String(release?.category || "").trim().toUpperCase());
}

function releaseMatchesToken(release, token) {
  const normalizedToken = normalizeToken(token);
  if (!normalizedToken) return false;
  const codes = Array.isArray(release?.codes) ? release.codes : [];
  return codes.some((code) => normalizeToken(code).includes(normalizedToken));
}

function firstMatchingToken(value, tokens) {
  const normalizedValue = normalizeToken(value);
  return tokens.find((token) => normalizedValue.includes(normalizeToken(token))) || null;
}

function buildNewestSetCards(newestSets) {
  const officialCards = readOfficialCards();
  return officialCards
    .map((card) => {
      const token = firstMatchingToken(card.releaseCode || card.id, newestSets);
      if (!token) return null;
      return {
        cardPrintId: String(card.id || "").trim(),
        setCode: String(token),
        releaseDate: String(card.releaseDate || ""),
      };
    })
    .filter(Boolean);
}

function loadDemandCards() {
  const raw = String(process.env.JUSTTCG_DEMAND_CARD_IDS || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((cardPrintId) => ({ cardPrintId, setCode: "" }));
}

function derivePrioritySetCodes(officialReleases, newestSets) {
  const deduped = [];
  const seen = new Set();

  for (const release of officialReleases || []) {
    if (!isBoosterRelease(release)) continue;
    if (!newestSets.some((token) => releaseMatchesToken(release, token))) continue;
    const firstCode = Array.isArray(release.codes) ? release.codes[0] : "";
    const normalizedCode = normalizeReleaseCode(firstCode);
    if (!normalizedCode || seen.has(normalizedCode)) continue;
    seen.add(normalizedCode);
    deduped.push(normalizedCode);
  }

  return deduped;
}

function estimateSetRefreshRequests(target, fetchPageSize = DEFAULT_FETCH_PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(Math.max(1, target.printCount || 1) / fetchPageSize));
  return 1 + pageCount;
}

export function partitionScheduledWork({
  quotaRemaining,
  hotQueue = [],
  deltaQueue = [],
  minimumRollingBudget = DEFAULT_MINIMUM_ROLLING_BUDGET,
}) {
  const remaining = Number.isFinite(Number(quotaRemaining)) ? Math.max(0, Number(quotaRemaining)) : 0;
  return {
    hotQueue: [...hotQueue],
    deltaQueue: remaining >= minimumRollingBudget ? [...deltaQueue] : [],
  };
}

export function buildScheduledRunPlan(options = {}) {
  return {
    dryRun: false,
    enableDiscovery: false,
    minimumRollingBudget: DEFAULT_MINIMUM_ROLLING_BUDGET,
    fetchPageSize: DEFAULT_FETCH_PAGE_SIZE,
    ...options,
    enableDiscovery: false,
  };
}

async function runNodeScript(label, scriptName, args) {
  const { spawn } = await import("node:child_process");
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(ROOT, "scripts", scriptName), ...args], {
      cwd: ROOT,
      env: process.env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ ok: code === 0, code, label }));
  });
}

export async function runScheduledRefresh(options = {}) {
  const plan = buildScheduledRunPlan(options);
  const config = loadPricingRefreshConfig();
  const state = loadJson(plan.statePath || DEFAULT_REFRESH_STATE_PATH, {
    lastSuccessfulUpdatedAfter: null,
  });
  const officialReleases = loadJson(OFFICIAL_RELEASES_PATH, []);
  const newestSetCards = buildNewestSetCards(config.newestSets);
  const demandCards = loadDemandCards();
  const deltaQueue = state.lastSuccessfulUpdatedAfter ? [{ cardPrintId: `delta:${state.lastSuccessfulUpdatedAfter}`, setCode: "DELTA" }] : [];
  const scheduledQueue = buildScheduledRefreshQueue({
    config,
    newestSetCards,
    demandCards,
    deltaCards: deltaQueue,
  });

  let remainingQuota =
    plan.quotaRemaining ??
    config.hardStopBudget ??
    config.perRunBudget ??
    DEFAULT_MINIMUM_ROLLING_BUDGET;

  const prioritySetCodes = derivePrioritySetCodes(officialReleases, config.newestSets);
  const executedSetRefreshes = [];
  const skippedSetRefreshes = [];

  for (const setCode of prioritySetCodes) {
    const target = resolveSetRefreshTarget({ requestedSetCode: setCode, releases: officialReleases });
    const estimatedRequests = estimateSetRefreshRequests(target, plan.fetchPageSize);
    if (estimatedRequests > remainingQuota) {
      skippedSetRefreshes.push({ setCode, reason: "quota_cap", estimatedRequests });
      continue;
    }

    if (!plan.dryRun) {
      await runSetRefresh({
        setCode,
        fetchPageSize: plan.fetchPageSize,
        requireResolvedSetId: true,
      });
    }

    remainingQuota -= estimatedRequests;
    executedSetRefreshes.push({ setCode, estimatedRequests });
  }

  const partition = partitionScheduledWork({
    quotaRemaining: remainingQuota,
    hotQueue: scheduledQueue.filter((entry) => entry.source === "newest" || entry.source === "demand"),
    deltaQueue,
    minimumRollingBudget: plan.minimumRollingBudget,
  });

  let deltaExecuted = false;
  if (partition.deltaQueue.length && state.lastSuccessfulUpdatedAfter != null) {
    if (!plan.dryRun) {
      const importResult = await runNodeScript("import", "import-justtcg-to-drizzle.mjs", [
        "--apply",
        "--updated-after",
        String(state.lastSuccessfulUpdatedAfter),
        "--fetch-page-size",
        String(plan.fetchPageSize),
      ]);
      if (!importResult.ok) {
        throw new Error(`scheduled import failed with exit code ${importResult.code ?? "unknown"}`);
      }

      const verifyResult = await runNodeScript("verify", "run-pricing-verification.mjs", [
        "--source",
        "justtcg_scheduled_refresh",
      ]);
      if (!verifyResult.ok) {
        throw new Error(`scheduled verification failed with exit code ${verifyResult.code ?? "unknown"}`);
      }

      const publishResult = await runNodeScript("publish", "publish-verified-prices.mjs", []);
      if (!publishResult.ok) {
        throw new Error(`scheduled publish failed with exit code ${publishResult.code ?? "unknown"}`);
      }
    }
    deltaExecuted = true;
  }

  const nextCursor = Math.floor(Date.now() / 1000);
  if (!plan.dryRun) {
    writeJson(plan.statePath || DEFAULT_REFRESH_STATE_PATH, {
      lastSuccessfulUpdatedAfter: nextCursor,
      updatedAt: new Date().toISOString(),
      latestExecutedSetCodes: executedSetRefreshes.map((entry) => entry.setCode),
      deltaExecuted,
    });
  }

  return {
    mode: "scheduled_refresh",
    dryRun: plan.dryRun,
    enableDiscovery: false,
    configuredNewestSets: config.newestSets,
    queueCounts: {
      total: scheduledQueue.length,
      newest: scheduledQueue.filter((entry) => entry.source === "newest").length,
      demand: scheduledQueue.filter((entry) => entry.source === "demand").length,
      delta: scheduledQueue.filter((entry) => entry.source === "delta").length,
    },
    prioritySetCodes,
    executedSetRefreshes,
    skippedSetRefreshes,
    deltaExecuted,
    deltaCursorUsed: state.lastSuccessfulUpdatedAfter ?? null,
    nextDeltaCursor: nextCursor,
    remainingQuota,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!String(process.env.JUSTTCG_API_KEY || "").trim()) {
    throw new Error("Missing JUSTTCG_API_KEY for scheduled JustTCG refresh");
  }
  if (!args.dryRun && !String(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || "").trim()) {
    throw new Error("Missing SUPABASE_DB_URL or DATABASE_URL for scheduled JustTCG refresh");
  }

  const summary = await runScheduledRefresh({
    dryRun: args.dryRun,
    quotaRemaining: args.quotaRemaining,
    minimumRollingBudget: args.minimumRollingBudget,
    statePath: args.statePath,
  });
  console.log(JSON.stringify(summary, null, 2));
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  });
}
