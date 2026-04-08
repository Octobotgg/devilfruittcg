#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadJson, writeJson } from "./lib/justtcg-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_REFRESH_STATE_PATH = path.join(ROOT, ".cache", "justtcg", "refresh-state.json");
const DEFAULT_FETCH_PAGE_SIZE = 20;
const DEFAULT_FETCH_DELAY_MS = 3000;
const DEFAULT_MODE = "full_refresh";
const VALID_MODES = new Set(["full_refresh", "delta_refresh"]);

function normalizeMode(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return VALID_MODES.has(normalized) ? normalized : DEFAULT_MODE;
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    mode: DEFAULT_MODE,
    statePath: DEFAULT_REFRESH_STATE_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (token === "--mode") {
      args.mode = normalizeMode(argv[index + 1]);
      index += 1;
      continue;
    }
    if (token === "--state-path") {
      args.statePath = argv[index + 1] ? path.resolve(process.cwd(), argv[index + 1]) : args.statePath;
      index += 1;
    }
  }

  return args;
}

export function buildScheduledRunPlan(options = {}) {
  return {
    dryRun: false,
    enableDiscovery: false,
    fetchPageSize: DEFAULT_FETCH_PAGE_SIZE,
    fetchDelayMs: DEFAULT_FETCH_DELAY_MS,
    mode: DEFAULT_MODE,
    statePath: DEFAULT_REFRESH_STATE_PATH,
    ...options,
    mode: normalizeMode(options.mode),
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

async function runImport({ mode, fetchPageSize, fetchDelayMs, updatedAfter }) {
  const args = ["--apply", "--fetch-page-size", String(fetchPageSize), "--fetch-delay-ms", String(fetchDelayMs)];
  if (mode === "full_refresh") {
    args.push("--updated-after", "0");
  } else if (updatedAfter != null) {
    args.push("--updated-after", String(updatedAfter));
  }

  const importResult = await runNodeScript("import", "import-justtcg-to-drizzle.mjs", args);
  if (!importResult.ok) {
    throw new Error(`${mode} import failed with exit code ${importResult.code ?? "unknown"}`);
  }
}

async function runKnownPricePublish({ source }) {
  const publishResult = await runNodeScript("publish_known_prices", "refresh-known-justtcg-prices.mjs", [
    "--all-known",
    "--source",
    source,
  ]);
  if (!publishResult.ok) {
    throw new Error(`known-price publish failed with exit code ${publishResult.code ?? "unknown"}`);
  }
}

export async function runScheduledRefresh(options = {}) {
  const plan = buildScheduledRunPlan(options);
  const state = loadJson(plan.statePath || DEFAULT_REFRESH_STATE_PATH, {
    lastSuccessfulUpdatedAfter: null,
  });
  const priorCursor = Number.isFinite(Number(state.lastSuccessfulUpdatedAfter))
    ? Number(state.lastSuccessfulUpdatedAfter)
    : null;

  let effectiveMode = plan.mode;
  let fallbackReason = null;
  if (effectiveMode === "delta_refresh" && priorCursor == null) {
    effectiveMode = "full_refresh";
    fallbackReason = "missing_delta_cursor";
  }

  const nextCursor = Math.floor(Date.now() / 1000);
  const source =
    effectiveMode === "full_refresh" ? "justtcg_daily_full_refresh" : "justtcg_daily_delta_refresh";

  if (!plan.dryRun) {
    await runImport({
      mode: effectiveMode,
      fetchPageSize: plan.fetchPageSize,
      fetchDelayMs: plan.fetchDelayMs,
      updatedAfter: priorCursor,
    });
    await runKnownPricePublish({ source });

    writeJson(plan.statePath || DEFAULT_REFRESH_STATE_PATH, {
      lastSuccessfulUpdatedAfter: nextCursor,
      updatedAt: new Date().toISOString(),
      lastRunMode: effectiveMode,
      requestedMode: plan.mode,
      fallbackReason,
    });
  }

  return {
    mode: plan.mode,
    effectiveMode,
    dryRun: plan.dryRun,
    enableDiscovery: false,
    fetchPageSize: plan.fetchPageSize,
    fetchDelayMs: plan.fetchDelayMs,
    deltaCursorUsed: effectiveMode === "delta_refresh" ? priorCursor : null,
    nextDeltaCursor: nextCursor,
    fallbackReason,
    source,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.dryRun && !String(process.env.JUSTTCG_API_KEY || "").trim()) {
    throw new Error("Missing JUSTTCG_API_KEY for scheduled JustTCG refresh");
  }
  if (!args.dryRun && !String(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || "").trim()) {
    throw new Error("Missing SUPABASE_DB_URL or DATABASE_URL for scheduled JustTCG refresh");
  }

  const summary = await runScheduledRefresh({
    dryRun: args.dryRun,
    mode: args.mode,
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
