#!/usr/bin/env node

import path from "path";
import { buildSuspiciousMappingReport } from "./lib/justtcg-suspicious-mappings.mjs";
import { DEFAULT_MAPPING_REPORT_PATH, loadJson, parseArgs, writeJson } from "./lib/justtcg-utils.mjs";

const DEFAULT_RELEASED_REPORT_PATH = path.join(
  path.dirname(DEFAULT_MAPPING_REPORT_PATH),
  "released-mapping-report.json",
);
const DEFAULT_OUTPUT_PATH = path.join(
  path.dirname(DEFAULT_MAPPING_REPORT_PATH),
  "suspicious-premium-mapping-report.json",
);

function summarize(report) {
  return {
    generatedAt: report.generatedAt,
    totalSuspicious: report.summary.totalSuspicious,
    premiumSuspicious: report.summary.premiumSuspicious,
    highPriceSuspicious: report.summary.highPriceSuspicious,
    topFlags: report.summary.byFlag.slice(0, 8),
    topTreatments: report.summary.byTreatment.slice(0, 8),
    topRows: report.rows.slice(0, 20),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mappingReportPath = path.resolve(String(args["mapping-report"] || DEFAULT_RELEASED_REPORT_PATH));
  const outputPath = path.resolve(String(args.out || DEFAULT_OUTPUT_PATH));
  const premiumOnly = args["all"] ? false : true;

  const mappingReport = loadJson(mappingReportPath, null);
  if (!mappingReport || !Array.isArray(mappingReport.results)) {
    throw new Error(`Invalid mapping report at ${mappingReportPath}`);
  }

  const report = buildSuspiciousMappingReport(mappingReport, { premiumOnly });
  writeJson(outputPath, report);

  console.log("Suspicious JustTCG mapping report");
  console.log(JSON.stringify(summarize(report), null, 2));
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
