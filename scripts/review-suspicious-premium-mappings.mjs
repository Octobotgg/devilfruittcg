#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { REPO_ROOT, DEFAULT_MAPPING_REPORT_PATH, loadJson, parseArgs, readOfficialCards, writeJson } from "./lib/justtcg-utils.mjs";
import { reviewSuspiciousPremiumMappings } from "./lib/justtcg-premium-review.mjs";

const DEFAULT_RELEASED_REPORT_PATH = path.join(path.dirname(DEFAULT_MAPPING_REPORT_PATH), "released-mapping-report.json");
const DEFAULT_LOCAL_SNAPSHOT_PATH = path.join(REPO_ROOT, ".cache", "justtcg", "one-piece-catalog.latest.json");
const DEFAULT_DESKTOP_SNAPSHOT_PATH = "/Users/javierbarro/Desktop/devilfruittcg/.cache/justtcg/one-piece-catalog.latest.json";
const DEFAULT_OUTPUT_REPORT_PATH = path.join(path.dirname(DEFAULT_MAPPING_REPORT_PATH), "released-mapping-report-premium-reviewed.json");
const DEFAULT_PROMOTED_REPORT_PATH = path.join(path.dirname(DEFAULT_MAPPING_REPORT_PATH), "premium-review-promoted.json");

function resolveSnapshotPath(requestedPath) {
  const candidates = [requestedPath, DEFAULT_LOCAL_SNAPSHOT_PATH, DEFAULT_DESKTOP_SNAPSHOT_PATH].filter(Boolean);
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`Could not find a JustTCG catalog snapshot. Checked: ${candidates.join(", ")}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mappingReportPath = path.resolve(String(args["mapping-report"] || DEFAULT_RELEASED_REPORT_PATH));
  const snapshotPath = path.resolve(resolveSnapshotPath(args.snapshot ? String(args.snapshot) : null));
  const outputReportPath = path.resolve(String(args.out || DEFAULT_OUTPUT_REPORT_PATH));
  const promotedReportPath = path.resolve(String(args["promoted-out"] || DEFAULT_PROMOTED_REPORT_PATH));

  const report = loadJson(mappingReportPath, null);
  const snapshot = loadJson(snapshotPath, null);
  const cards = readOfficialCards();

  if (!report || !Array.isArray(report.results)) {
    throw new Error(`Invalid mapping report at ${mappingReportPath}`);
  }
  if (!snapshot || !Array.isArray(snapshot.cards)) {
    throw new Error(`Invalid catalog snapshot at ${snapshotPath}`);
  }

  const review = reviewSuspiciousPremiumMappings({ report, snapshot, cards });
  const promotedById = new Map(review.promoted.map((entry) => [entry.cardId, entry]));
  const nextReport = {
    ...report,
    generatedAt: new Date().toISOString(),
    results: review.results,
    autoApproved: [
      ...(Array.isArray(report.autoApproved) ? report.autoApproved : []),
      ...review.promoted.map((entry) => ({
        cardId: entry.cardId,
        lane: entry.lane,
        confidence: entry.confidence,
        confidenceReasons: entry.confidenceReasons,
        bestCandidate: entry.bestCandidate,
      })),
    ],
  };

  writeJson(outputReportPath, nextReport);
  writeJson(promotedReportPath, {
    generatedAt: new Date().toISOString(),
    sourceReportPath: mappingReportPath,
    snapshotPath,
    promotedCount: review.promoted.length,
    remainingCount: review.remaining.length,
    promoted: review.promoted,
  });

  console.log(JSON.stringify({
    mappingReportPath,
    snapshotPath,
    outputReportPath,
    promotedReportPath,
    promotedCount: review.promoted.length,
    remainingCount: review.remaining.length,
    promotedSamples: review.promoted.slice(0, 10).map((entry) => ({
      cardId: entry.cardId,
      candidate: entry.bestCandidate?.name || null,
      candidateSet: entry.bestCandidate?.set || null,
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
