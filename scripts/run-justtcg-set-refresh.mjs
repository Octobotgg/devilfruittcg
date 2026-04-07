#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const OFFICIAL_RELEASES_PATH = path.join(REPO_ROOT, "data", "bandai-en-official-releases.json");
const JUSTTCG_SETS_URL = "https://api.justtcg.com/v1/sets";
const JUSTTCG_GAME_ID = "one-piece-card-game";
const DEFAULT_FETCH_PAGE_SIZE = 20;
const ALLOWED_RELEASE_CATEGORIES = new Set(["BOOSTER_PACK", "EXTRA_BOOSTER", "BOOSTER_BOX"]);

function normalizeSetCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function formatDisplaySetCode(value) {
  const normalized = normalizeSetCode(value);
  if (/^OP\d{2}EB\d{2}$/.test(normalized)) {
    return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
  }
  if (/^OP\d{2}$/.test(normalized) || /^EB\d{2}$/.test(normalized) || /^ST\d{2}$/.test(normalized)) {
    return normalized;
  }
  return String(value || "").trim().toUpperCase() || normalized;
}

function cleanReleaseName(value) {
  return String(value || "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractBracketCode(value) {
  const match = String(value || "").match(/\[([A-Z0-9-]+)\]/i);
  return match ? match[1] : "";
}

function isBoosterRelease(release) {
  return ALLOWED_RELEASE_CATEGORIES.has(String(release?.category || "").trim().toUpperCase());
}

async function readOfficialReleases(filePath = OFFICIAL_RELEASES_PATH) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

export function resolveSetRefreshTarget({ requestedSetCode, releases }) {
  const displayCode = formatDisplaySetCode(requestedSetCode);
  const normalizedCode = normalizeSetCode(displayCode);
  const matchedRelease = (releases || []).find((release) => {
    if (!isBoosterRelease(release)) return false;
    const candidateCodes = [
      ...(Array.isArray(release?.codes) ? release.codes : []),
      extractBracketCode(release?.name),
    ]
      .map((entry) => normalizeSetCode(entry))
      .filter(Boolean);
    return candidateCodes.includes(normalizedCode);
  });

  if (!matchedRelease) {
    throw new Error(`Unable to resolve booster release for ${displayCode}`);
  }

  return {
    code: displayCode,
    normalizedCode,
    releaseName: String(matchedRelease.name || "").trim(),
    category: String(matchedRelease.category || "").trim(),
    releaseDate: matchedRelease.releaseDate ?? null,
    printCount: Number(matchedRelease.printCount || 0) || 0,
    queryName: cleanReleaseName(matchedRelease.name),
  };
}

function chooseBestSetCandidate(candidates, target) {
  const targetName = cleanReleaseName(target.releaseName).toLowerCase();
  const targetCode = target.code.toLowerCase();
  const scored = (candidates || [])
    .map((candidate) => {
      const name = String(candidate?.name || "").trim();
      const normalizedName = name.toLowerCase();
      let score = 0;
      if (normalizedName === targetName) score += 100;
      if (normalizedName.includes(targetName)) score += 50;
      if (normalizedName.includes(targetCode)) score += 25;
      if (/release event/i.test(name)) score -= 1000;
      score += Number(candidate?.cards_count || candidate?.count || 0) / 1000;
      return { candidate, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  return scored[0]?.candidate ?? null;
}

export async function resolveJusttcgSetId({
  apiKey,
  target,
  fetchImpl = fetch,
}) {
  const token = String(apiKey || "").trim();
  if (!token) return null;

  const queries = [target.queryName, target.code];
  let bestCandidate = null;

  for (const query of queries) {
    const url = new URL(JUSTTCG_SETS_URL);
    url.searchParams.set("game", JUSTTCG_GAME_ID);
    url.searchParams.set("q", query);
    url.searchParams.set("orderBy", "release_date");
    url.searchParams.set("order", "desc");

    const response = await fetchImpl(url, {
      headers: {
        "x-api-key": token,
      },
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(`JustTCG set lookup failed (${response.status}): ${payload?.error || payload?.code || "unknown error"}`);
    }

    const candidate = chooseBestSetCandidate(payload?.data || [], target);
    if (candidate) {
      bestCandidate = candidate;
      break;
    }
  }

  if (!bestCandidate) return null;

  return {
    id: String(bestCandidate.id || "").trim(),
    name: String(bestCandidate.name || "").trim(),
    cardsCount: Number(bestCandidate.cards_count || bestCandidate.count || 0) || 0,
    releaseDate: bestCandidate.release_date ?? null,
  };
}

function runNodeScript(label, scriptPath, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: REPO_ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = String(chunk);
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = String(chunk);
      stderr += text;
      process.stderr.write(text);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      resolve({
        ok: code === 0,
        code,
        label,
        stdout,
        stderr,
      });
    });
  });
}

export async function runSetRefresh({
  setCode,
  dryRun = false,
  fetchPageSize = DEFAULT_FETCH_PAGE_SIZE,
  releases,
  apiKey = process.env.JUSTTCG_API_KEY,
  fetchImpl = fetch,
  runCommand = (label, step) => runNodeScript(label, step.command, step.args),
  requireResolvedSetId = false,
} = {}) {
  const officialReleases = releases || (await readOfficialReleases());
  const target = resolveSetRefreshTarget({ requestedSetCode: setCode, releases: officialReleases });
  const resolvedSet = await resolveJusttcgSetId({
    apiKey,
    target,
    fetchImpl,
  });

  if (requireResolvedSetId && !resolvedSet?.id) {
    throw new Error(`Unable to resolve a JustTCG set id for ${target.code}`);
  }

  const justtcgSetId = resolvedSet?.id || target.normalizedCode;
  const steps = [
    {
      label: "import",
      command: path.join(REPO_ROOT, "scripts", "import-justtcg-to-drizzle.mjs"),
      args: ["--apply", "--updated-after", "0", "--set", justtcgSetId, "--fetch-page-size", String(fetchPageSize)],
    },
    {
      label: "publish_known_prices",
      command: path.join(REPO_ROOT, "scripts", "refresh-known-justtcg-prices.mjs"),
      args: [
        "--release-name",
        target.releaseName,
        "--source",
        "justtcg_set_refresh",
      ],
    },
  ];

  const summary = {
    mode: "set_refresh",
    setCode: target.code,
    releaseName: target.releaseName,
    releaseCategory: target.category,
    justtcgSetId,
    justtcgSetName: resolvedSet?.name ?? null,
    fetchPageSize,
    targetCardPrintCount: Number(target.printCount || 0) || 0,
    dryRun,
    steps: steps.map((step) => ({
      label: step.label,
      command: [path.relative(REPO_ROOT, step.command), ...step.args].join(" "),
    })),
  };

  if (dryRun) {
    return summary;
  }

  for (const step of steps) {
    const result = await runCommand(step.label, step);
    if (!result?.ok) {
      throw new Error(`${step.label} step failed with exit code ${result?.code ?? "unknown"}`);
    }
  }

  return summary;
}

function parseArgs(argv) {
  const args = {
    set: "",
    dryRun: false,
    fetchPageSize: DEFAULT_FETCH_PAGE_SIZE,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--set") {
      args.set = String(argv[index + 1] || "").trim();
      index += 1;
      continue;
    }
    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (token === "--fetch-page-size") {
      const parsed = Number.parseInt(String(argv[index + 1] || ""), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        args.fetchPageSize = Math.min(parsed, DEFAULT_FETCH_PAGE_SIZE);
      }
      index += 1;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.set) {
    throw new Error("Missing required --set argument");
  }
  if (!String(process.env.JUSTTCG_API_KEY || "").trim()) {
    throw new Error("Missing JUSTTCG_API_KEY for JustTCG set refresh");
  }

  const summary = await runSetRefresh({
    setCode: args.set,
    dryRun: args.dryRun,
    fetchPageSize: args.fetchPageSize,
    requireResolvedSetId: true,
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
