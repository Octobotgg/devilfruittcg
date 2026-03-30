#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_HIGH_VALUE_THRESHOLD = 200;
const PUBLISHABLE_VERIFICATION_STATUSES = new Set(["verified", "drift_warning"]);
const BLOCKED_CONFLICT_TYPES = new Set(["duplicate_product_assignment", "ui_label_mismatch"]);
const NON_PREMIUM_LABELS = new Set(["", "base", "normal", "reprint", "standard", "unknown", "fallback"]);

async function loadPostgresModule() {
  return import(pathToFileURL(path.join(ROOT, "db/postgres.ts")).href);
}

function normalizeText(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : null;
}

function toNumber(value) {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseArgs(argv) {
  const args = {
    verificationRunId: null,
    premiumOnly: false,
    highValueOnly: false,
    highValueThreshold: DEFAULT_HIGH_VALUE_THRESHOLD,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--verification-run-id") {
      const parsed = Number.parseInt(String(argv[index + 1] || ""), 10);
      args.verificationRunId = Number.isFinite(parsed) ? parsed : null;
      index += 1;
      continue;
    }
    if (value === "--premium-only") {
      args.premiumOnly = true;
      continue;
    }
    if (value === "--high-value-only") {
      args.highValueOnly = true;
      continue;
    }
    if (value === "--high-value-threshold") {
      const parsed = Number.parseFloat(String(argv[index + 1] || ""));
      args.highValueThreshold = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_HIGH_VALUE_THRESHOLD;
      index += 1;
    }
  }

  return args;
}

function normalizeRun(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    status: String(row.status || ""),
    startedAt: row.startedAt || row.started_at || null,
    finishedAt: row.finishedAt || row.finished_at || null,
    source: String(row.source || ""),
    notes: row.notes == null ? null : String(row.notes),
  };
}

function normalizeConflict(row) {
  return {
    verificationRunId: Number(row.verificationRunId ?? row.verification_run_id ?? 0),
    cardPrintId: String(row.cardPrintId ?? row.card_print_id ?? ""),
    externalProductId: row.externalProductId ?? row.external_product_id ?? null,
    externalVariantId: row.externalVariantId ?? row.external_variant_id ?? null,
    tcgplayerProductId: row.tcgplayerProductId ?? row.tcgplayer_product_id ?? null,
    conflictType: String(row.conflictType ?? row.conflict_type ?? ""),
    expectedNumber: row.expectedNumber ?? row.expected_number ?? null,
    expectedSetCode: row.expectedSetCode ?? row.expected_set_code ?? null,
    expectedName: row.expectedName ?? row.expected_name ?? null,
    providerNumber: row.providerNumber ?? row.provider_number ?? null,
    providerSetName: row.providerSetName ?? row.provider_set_name ?? null,
    providerProductName: row.providerProductName ?? row.provider_product_name ?? null,
    details: row.details && typeof row.details === "object" ? row.details : {},
    createdAt: row.createdAt || row.created_at || null,
  };
}

function isPremiumLabel(value) {
  const label = normalizeText(value)?.toLowerCase() ?? "";
  return !NON_PREMIUM_LABELS.has(label);
}

function isPremiumRow(row) {
  return isPremiumLabel(row.cardPrintVariantLabel || row.displayTreatmentLabel);
}

function isHighValueRow(row, threshold) {
  const values = [row.justtcgPriceNm, row.tcgplayerMarketPrice, row.publishedPriceNmBefore]
    .map(toNumber)
    .filter((value) => value != null);
  return values.length ? Math.max(...values) >= threshold : false;
}

function hasChangedCandidate(row) {
  const delta = toNumber(row.priceDeltaAbs);
  return delta != null && delta > 0;
}

function isPublishableRow(row) {
  if (!PUBLISHABLE_VERIFICATION_STATUSES.has(row.verificationStatus)) return false;
  if (!row.externalProductId || !row.externalVariantId) return false;
  if (row.justtcgPriceNm == null) return false;
  return !(row.conflictTypes || []).some((conflictType) => BLOCKED_CONFLICT_TYPES.has(conflictType));
}

function normalizeResultRow(row, conflictTypes, options) {
  const normalized = {
    verificationRunId: Number(row.verificationRunId ?? row.verification_run_id ?? options.verificationRunId ?? 0),
    cardPrintId: String(row.cardPrintId ?? row.card_print_id ?? ""),
    externalProductId: row.externalProductId ?? row.external_product_id ?? null,
    externalVariantId: row.externalVariantId ?? row.external_variant_id ?? null,
    tcgplayerProductId: row.tcgplayerProductId ?? row.tcgplayer_product_id ?? null,
    justtcgPriceNm: toNumber(row.justtcgPriceNm ?? row.justtcg_price_nm),
    tcgplayerMarketPrice: toNumber(row.tcgplayerMarketPrice ?? row.tcgplayer_market_price),
    publishedPriceNmBefore: toNumber(row.publishedPriceNmBefore ?? row.published_price_nm_before),
    priceDeltaAbs: toNumber(row.priceDeltaAbs ?? row.price_delta_abs),
    priceDeltaRatio: toNumber(row.priceDeltaRatio ?? row.price_delta_ratio),
    mappingIntegrityStatus: String(row.mappingIntegrityStatus ?? row.mapping_integrity_status ?? "unknown"),
    labelIntegrityStatus: String(row.labelIntegrityStatus ?? row.label_integrity_status ?? "unknown"),
    verificationStatus: String(row.verificationStatus ?? row.verification_status ?? "unknown"),
    reason: String(row.reason ?? ""),
    checkedAt: String(row.checkedAt ?? row.checked_at ?? ""),
    rawTcgplayerPayload: row.rawTcgplayerPayload ?? row.raw_tcgplayer_payload ?? null,
    cardPrintVariantLabel: normalizeText(row.cardPrintVariantLabel ?? row.card_print_variant_label),
    displayTreatmentLabel: normalizeText(row.displayTreatmentLabel ?? row.display_treatment_label),
  };

  normalized.conflictTypes = [...conflictTypes].sort();
  normalized.conflictCount = normalized.conflictTypes.length;
  normalized.changedCandidate = hasChangedCandidate(normalized);
  normalized.premium = isPremiumRow(normalized);
  normalized.highValue = isHighValueRow(normalized, options.highValueThreshold);
  normalized.publishable = isPublishableRow(normalized);
  return normalized;
}

function filterRows(rows, options) {
  return rows.filter((row) => {
    if (options.premiumOnly && !row.premium) return false;
    if (options.highValueOnly && !row.highValue) return false;
    return true;
  });
}

function sortByCardPrintId(left, right) {
  return String(left.cardPrintId).localeCompare(String(right.cardPrintId));
}

function sortByDollarDelta(left, right) {
  const leftValue = left.priceDeltaAbs ?? -1;
  const rightValue = right.priceDeltaAbs ?? -1;
  return rightValue - leftValue || sortByCardPrintId(left, right);
}

function sortByRatioDelta(left, right) {
  const leftValue = left.priceDeltaRatio ?? -1;
  const rightValue = right.priceDeltaRatio ?? -1;
  return rightValue - leftValue || sortByDollarDelta(left, right);
}

function countByReason(conflicts) {
  const counts = new Map();
  for (const conflict of conflicts) {
    const reason = normalizeText(conflict.conflictType);
    if (!reason) continue;
    counts.set(reason, (counts.get(reason) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([reason, count]) => ({ reason, count }));
}

function buildBuckets(rows) {
  const changedCandidateRows = rows.filter((row) => row.changedCandidate).sort(sortByDollarDelta);
  const mappingConflicts = rows.filter((row) => row.verificationStatus === "mapping_conflict").sort(sortByCardPrintId);
  const driftWarnings = rows.filter((row) => row.verificationStatus === "drift_warning").sort(sortByDollarDelta);
  const missingTcgplayerId = rows.filter((row) => row.verificationStatus === "missing_tcgplayer_id").sort(sortByCardPrintId);
  const rowsWithMappingConflicts = rows.filter((row) => row.conflictCount > 0).sort(sortByCardPrintId);
  const duplicateAssignments = rows
    .filter((row) =>
      row.conflictTypes.some((conflictType) => conflictType === "duplicate_product_assignment" || conflictType === "duplicate_variant_assignment"),
    )
    .sort(sortByCardPrintId);
  const labelMismatches = rows.filter((row) => row.conflictTypes.includes("ui_label_mismatch")).sort(sortByCardPrintId);

  return {
    changedCandidateRows,
    mappingConflicts,
    driftWarnings,
    missingTcgplayerId,
    rowsWithMappingConflicts,
    duplicateAssignments,
    labelMismatches,
  };
}

export function buildPricingVerificationReport(input) {
  const verificationRun = normalizeRun(input?.verificationRun || input?.run);
  if (!verificationRun) {
    throw new Error("buildPricingVerificationReport requires a verification run");
  }

  const rawResults = Array.isArray(input?.results)
    ? input.results
    : Array.isArray(input?.verificationResults)
      ? input.verificationResults
      : [];
  const rawConflicts = Array.isArray(input?.conflicts) ? input.conflicts : [];
  const options = {
    premiumOnly: Boolean(input?.options?.premiumOnly ?? input?.filters?.premiumOnly ?? false),
    highValueOnly: Boolean(input?.options?.highValueOnly ?? input?.filters?.highValueOnly ?? false),
    highValueThreshold:
      toNumber(input?.options?.highValueThreshold ?? input?.filters?.highValueThreshold ?? input?.filters?.minimumPriceNm) ??
      DEFAULT_HIGH_VALUE_THRESHOLD,
  };

  const conflictRows = rawConflicts.map(normalizeConflict);
  const conflictTypesByCardPrintId = new Map();
  for (const conflict of conflictRows) {
    const current = conflictTypesByCardPrintId.get(conflict.cardPrintId) || [];
    current.push(conflict.conflictType);
    conflictTypesByCardPrintId.set(conflict.cardPrintId, current);
  }

  const normalizedRows = rawResults.map((row) => {
    const conflictTypes = conflictTypesByCardPrintId.get(String(row.cardPrintId ?? row.card_print_id ?? "")) || [];
    return normalizeResultRow(row, conflictTypes, options);
  });
  const filteredRows = filterRows(normalizedRows, options);
  const buckets = buildBuckets(filteredRows);
  const topMismatchesByDollarDelta = filteredRows
    .filter((row) => row.priceDeltaAbs != null)
    .sort(sortByDollarDelta)
    .slice(0, 10);
  const topMismatchesByRatioDelta = filteredRows
    .filter((row) => row.priceDeltaRatio != null)
    .sort(sortByRatioDelta)
    .slice(0, 10);

  const summary = {
    totalCheckedRows: filteredRows.length,
    changedCandidateRows: buckets.changedCandidateRows.length,
    mappingConflicts: buckets.mappingConflicts.length,
    verifiedRows: filteredRows.filter((row) => row.verificationStatus === "verified").length,
    publishedRows: filteredRows.filter((row) => row.publishable).length,
    blockedRows: filteredRows.filter((row) => !row.publishable).length,
    driftWarnings: buckets.driftWarnings.length,
    missingTcgplayerId: buckets.missingTcgplayerId.length,
    rowsWithMappingConflicts: buckets.rowsWithMappingConflicts.length,
    duplicateAssignments: buckets.duplicateAssignments.length,
    labelMismatches: buckets.labelMismatches.length,
  };

  return {
    generatedAt: new Date().toISOString(),
    verificationRun,
    filters: options,
    summary,
    conflictBreakdownByReason: countByReason(conflictRows),
    topMismatchesByDollarDelta,
    topMismatchesByRatioDelta,
    buckets,
  };
}

export async function createPostgresPricingVerificationReportAdapter(sql) {
  const postgresModule = await loadPostgresModule();
  const postgresClient = sql ?? postgresModule.createPostgresClient();

  return {
    async loadLatestVerificationRun() {
      const rows = await postgresClient.unsafe(
        `
          select
            id,
            status,
            started_at::text as "startedAt",
            finished_at::text as "finishedAt",
            source,
            notes
          from pricing_verification_runs
          order by started_at desc, id desc
          limit 1
        `,
      );
      return normalizeRun(rows[0] || null);
    },
    async loadVerificationRun(verificationRunId) {
      const rows = await postgresClient.unsafe(
        `
          select
            id,
            status,
            started_at::text as "startedAt",
            finished_at::text as "finishedAt",
            source,
            notes
          from pricing_verification_runs
          where id = $1
          limit 1
        `,
        [verificationRunId],
      );
      return normalizeRun(rows[0] || null);
    },
    async loadVerificationResults(verificationRunId) {
      const rows = await postgresClient.unsafe(
        `
          select
            vr.verification_run_id as "verificationRunId",
            vr.card_print_id as "cardPrintId",
            vr.external_product_id as "externalProductId",
            vr.external_variant_id as "externalVariantId",
            vr.tcgplayer_product_id as "tcgplayerProductId",
            vr.justtcg_price_nm as "justtcgPriceNm",
            vr.tcgplayer_market_price as "tcgplayerMarketPrice",
            vr.published_price_nm_before as "publishedPriceNmBefore",
            vr.price_delta_abs as "priceDeltaAbs",
            vr.price_delta_ratio as "priceDeltaRatio",
            vr.mapping_integrity_status as "mappingIntegrityStatus",
            vr.label_integrity_status as "labelIntegrityStatus",
            vr.verification_status as "verificationStatus",
            vr.reason as "reason",
            vr.checked_at::text as "checkedAt",
            vr.raw_tcgplayer_payload as "rawTcgplayerPayload",
            cp.variant_label as "cardPrintVariantLabel",
            display.display_treatment_label as "displayTreatmentLabel"
          from pricing_verification_results vr
          left join card_prints cp on cp.id = vr.card_print_id
          left join card_print_display_published display
            on display.card_print_id = vr.card_print_id
          where vr.verification_run_id = $1
          order by coalesce(vr.price_delta_abs, 0) desc, coalesce(vr.price_delta_ratio, 0) desc, vr.card_print_id
        `,
        [verificationRunId],
      );
      return rows.map((row) => ({
        verificationRunId: Number(row.verificationRunId),
        cardPrintId: String(row.cardPrintId),
        externalProductId: row.externalProductId ?? null,
        externalVariantId: row.externalVariantId ?? null,
        tcgplayerProductId: row.tcgplayerProductId ?? null,
        justtcgPriceNm: toNumber(row.justtcgPriceNm),
        tcgplayerMarketPrice: toNumber(row.tcgplayerMarketPrice),
        publishedPriceNmBefore: toNumber(row.publishedPriceNmBefore),
        priceDeltaAbs: toNumber(row.priceDeltaAbs),
        priceDeltaRatio: toNumber(row.priceDeltaRatio),
        mappingIntegrityStatus: String(row.mappingIntegrityStatus || "unknown"),
        labelIntegrityStatus: String(row.labelIntegrityStatus || "unknown"),
        verificationStatus: String(row.verificationStatus || "unknown"),
        reason: String(row.reason || ""),
        checkedAt: String(row.checkedAt || ""),
        rawTcgplayerPayload: row.rawTcgplayerPayload ?? null,
        cardPrintVariantLabel: normalizeText(row.cardPrintVariantLabel),
        displayTreatmentLabel: normalizeText(row.displayTreatmentLabel),
      }));
    },
    async loadVerificationConflicts(verificationRunId) {
      const rows = await postgresClient.unsafe(
        `
          select
            verification_run_id as "verificationRunId",
            card_print_id as "cardPrintId",
            external_product_id as "externalProductId",
            external_variant_id as "externalVariantId",
            tcgplayer_product_id as "tcgplayerProductId",
            conflict_type as "conflictType",
            expected_number as "expectedNumber",
            expected_set_code as "expectedSetCode",
            expected_name as "expectedName",
            provider_number as "providerNumber",
            provider_set_name as "providerSetName",
            provider_product_name as "providerProductName",
            details,
            created_at::text as "createdAt"
          from pricing_mapping_conflicts
          where verification_run_id = $1
          order by card_print_id, conflict_type
        `,
        [verificationRunId],
      );
      return rows.map(normalizeConflict);
    },
  };
}

export async function generatePricingVerificationReport(options = {}) {
  const adapter = options.adapter ?? (await createPostgresPricingVerificationReportAdapter());
  const verificationRunId = options.verificationRunId ?? options.runId ?? null;
  const mergedOptions = {
    ...(options.filters || {}),
    ...(options.options || {}),
  };
  if (options.premiumOnly != null) mergedOptions.premiumOnly = options.premiumOnly;
  if (options.highValueOnly != null) mergedOptions.highValueOnly = options.highValueOnly;
  if (options.highValueThreshold != null) mergedOptions.highValueThreshold = options.highValueThreshold;

  const verificationRun = verificationRunId
    ? await adapter.loadVerificationRun(verificationRunId)
    : await adapter.loadLatestVerificationRun();

  if (!verificationRun) {
    throw new Error("No pricing verification run found");
  }

  const [results, conflicts] = await Promise.all([
    adapter.loadVerificationResults(verificationRun.id),
    adapter.loadVerificationConflicts(verificationRun.id),
  ]);

  return buildPricingVerificationReport({
    verificationRun,
    results,
    conflicts,
    options: mergedOptions,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const adapter = await createPostgresPricingVerificationReportAdapter();
  const report = await generatePricingVerificationReport({
    adapter,
    verificationRunId: args.verificationRunId,
    options: {
      premiumOnly: args.premiumOnly,
      highValueOnly: args.highValueOnly,
      highValueThreshold: args.highValueThreshold,
    },
  });

  console.log(JSON.stringify(report, null, 2));
}

const isDirectRun = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  });
}
