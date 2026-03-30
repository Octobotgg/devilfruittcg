#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { getTcgplayerProductDetail } from "./lib/tcgplayer-detail-cache.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_TCGPLAYER_CACHE_PATH = path.join(ROOT, ".cache", "justtcg", "tcgplayer-details-cache.json");
const JUSTTCG_SOURCE_ID = "justtcg";

async function loadPricingVerifierModule() {
  return import(pathToFileURL(path.join(ROOT, "lib/server/pricing/pricing-verifier.ts")).href);
}

async function loadPostgresModule() {
  return import(pathToFileURL(path.join(ROOT, "db/postgres.ts")).href);
}

function normalizeText(value) {
  const trimmed = String(value || "").trim();
  return trimmed ? trimmed : null;
}

function parseArgs(argv) {
  const args = {
    source: "justtcg_refresh",
    cachePath: DEFAULT_TCGPLAYER_CACHE_PATH,
    cardPrintIds: [],
    limit: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--source") {
      args.source = String(argv[index + 1] || args.source).trim() || args.source;
      index += 1;
      continue;
    }
    if (value === "--cache-path") {
      args.cachePath = argv[index + 1]
        ? path.resolve(process.cwd(), argv[index + 1])
        : args.cachePath;
      index += 1;
      continue;
    }
    if (value === "--card-print-id") {
      args.cardPrintIds = String(argv[index + 1] || "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
      index += 1;
      continue;
    }
    if (value === "--limit") {
      const parsed = Number.parseInt(String(argv[index + 1] || ""), 10);
      args.limit = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      index += 1;
    }
  }

  return args;
}

function extractMarketPrice(detail) {
  const candidates = [
    detail?.marketPrice,
    detail?.data?.marketPrice,
    detail?.product?.marketPrice,
    detail?.results?.[0]?.marketPrice,
    detail?.result?.marketPrice,
  ];
  for (const value of candidates) {
    const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function coerceConflictRecord(candidate, conflict) {
  return {
    cardPrintId: candidate.cardPrint.id,
    externalProductId: normalizeText(candidate.provider.externalProductId),
    externalVariantId: normalizeText(candidate.provider.externalVariantId),
    tcgplayerProductId: normalizeText(candidate.provider.tcgplayerProductId),
    conflictType: conflict.conflictType,
    expectedNumber: conflict.expectedNumber,
    expectedSetCode: conflict.expectedSetCode,
    expectedName: conflict.expectedName,
    providerNumber: conflict.providerNumber,
    providerSetName: conflict.providerSetName,
    providerProductName: conflict.providerProductName,
    details: conflict.details ?? {},
  };
}

function mergeDisplayFields(candidate, computedDisplay, mappingResult) {
  const publishedDisplay = candidate.publishedDisplay || {};
  const displayTreatmentLabel =
    mappingResult.normalizedProviderTreatmentLabel ??
    normalizeText(publishedDisplay.displayTreatmentLabel) ??
    normalizeText(computedDisplay.displayTreatmentLabel);

  const labelStatus =
    mappingResult.mappingIntegrityStatus === "blocked"
      ? "blocked"
      : mappingResult.labelIntegrityStatus && mappingResult.labelIntegrityStatus !== "verified"
        ? mappingResult.labelIntegrityStatus
        : publishedDisplay.labelStatus || computedDisplay.labelStatus || "fallback";

  return {
    displayTitle:
      normalizeText(publishedDisplay.displayTitle) || normalizeText(computedDisplay.displayTitle) || normalizeText(candidate.cardPrint.title),
    displaySetName:
      normalizeText(publishedDisplay.displaySetName) ||
      normalizeText(computedDisplay.displaySetName) ||
      normalizeText(candidate.cardPrint.setName),
    displaySetCode:
      normalizeText(publishedDisplay.displaySetCode) ||
      normalizeText(computedDisplay.displaySetCode) ||
      normalizeText(candidate.cardPrint.setCode),
    displayRarity:
      normalizeText(publishedDisplay.displayRarity) ||
      normalizeText(computedDisplay.displayRarity) ||
      normalizeText(candidate.cardPrint.rarity),
    displayTreatmentLabel,
    displayImageUrl:
      normalizeText(publishedDisplay.displayImageUrl) ||
      normalizeText(computedDisplay.displayImageUrl) ||
      normalizeText(candidate.cardPrint.imageUrl),
    labelStatus,
  };
}

function buildPublishableCandidate(candidate, verificationStatus, displayFields) {
  return {
    cardPrintId: candidate.cardPrint.id,
    sourceId: candidate.sourceId || JUSTTCG_SOURCE_ID,
    externalProductId: normalizeText(candidate.provider.externalProductId),
    externalVariantId: normalizeText(candidate.provider.externalVariantId),
    verificationStatus,
    conflictTypes: candidate.conflictTypes || [],
    priceMarket: candidate.priceMarket ?? candidate.justtcgPriceNm ?? null,
    priceNm: candidate.justtcgPriceNm ?? candidate.priceNm ?? null,
    priceLp: candidate.priceLp ?? null,
    updatedAt: candidate.providerUpdatedAt ?? candidate.updatedAt ?? null,
    displaySetName: displayFields.displaySetName,
    displaySetCode: displayFields.displaySetCode,
    displayRarity: displayFields.displayRarity,
    displayTitle: displayFields.displayTitle,
    displayTreatmentLabel: displayFields.displayTreatmentLabel,
    displayImageUrl: displayFields.displayImageUrl,
    labelStatus: displayFields.labelStatus,
    officialName: candidate.cardPrint.title ?? null,
    officialSetName: candidate.cardPrint.setName ?? null,
    officialSetCode: candidate.cardPrint.setCode ?? null,
    officialRarity: candidate.cardPrint.rarity ?? null,
  };
}

export async function runPricingVerification(options) {
  const { verifyMappingIntegrity, verifyPriceDrift, buildPublishedDisplayPayload } =
    await loadPricingVerifierModule();
  const adapter = options?.adapter;
  if (!adapter) {
    throw new Error("runPricingVerification requires an adapter");
  }

  const now = options?.now ?? (() => new Date().toISOString());
  const fetchDetail =
    options?.fetchTcgplayerDetail ??
    ((params) =>
      getTcgplayerProductDetail({
        productId: params.productId,
        cache: params.cache,
        cachePath: params.cachePath,
      }));
  const cache = options?.cache ?? {};
  const cachePath = options?.cachePath ?? DEFAULT_TCGPLAYER_CACHE_PATH;
  const startedAt = now();
  const verificationRunId = await adapter.createVerificationRun(options?.source ?? "justtcg_refresh", null, startedAt);
  const publishedPriceRowsByCardPrintId = options?.publishedPriceRowsByCardPrintId ?? new Map();

  try {
    const results = [];
    const conflicts = [];
    const publishableCandidates = [];

    for (const candidate of options?.candidates || []) {
      const cardPrintId = String(candidate.cardPrint?.id || "").trim();
      const tcgplayerProductId = normalizeText(candidate.provider?.tcgplayerProductId);
      const checkedAt = candidate.checkedAt ?? now();
      let tcgplayerDetail = null;

      if (candidate.tcgplayerMarketPrice == null && tcgplayerProductId) {
        tcgplayerDetail = await fetchDetail({
          productId: tcgplayerProductId,
          cache,
          cachePath,
        });
      } else if (tcgplayerProductId) {
        tcgplayerDetail = { marketPrice: candidate.tcgplayerMarketPrice };
      }

      const mappingResult = verifyMappingIntegrity({
        cardPrint: candidate.cardPrint,
        provider: candidate.provider,
        duplicateVariantCardPrintIds: candidate.duplicateVariantCardPrintIds || [],
        duplicateProductCardPrintIds: candidate.duplicateProductCardPrintIds || [],
        publishedDisplay: candidate.publishedDisplay || null,
      });

      const computedDisplay = buildPublishedDisplayPayload({
        cardPrint: candidate.cardPrint,
        provider: candidate.provider,
      });

      const priceDrift = verifyPriceDrift({
        mappingIntegrityStatus: mappingResult.mappingIntegrityStatus,
        isPremium: Boolean(candidate.cardPrint?.treatmentLabel || computedDisplay.displayTreatmentLabel),
        justtcgPriceNm: candidate.justtcgPriceNm ?? candidate.priceNm ?? null,
        tcgplayerMarketPrice:
          candidate.tcgplayerMarketPrice ?? extractMarketPrice(tcgplayerDetail),
        externalVariantId: normalizeText(candidate.provider?.externalVariantId),
        tcgplayerProductId,
        providerUpdatedAt: candidate.providerUpdatedAt ?? candidate.updatedAt ?? null,
        checkedAt,
      });

      const verificationStatus =
        mappingResult.verificationStatus !== "verified"
          ? mappingResult.verificationStatus
          : priceDrift.verificationStatus;

      const displayFields = mergeDisplayFields(candidate, computedDisplay, mappingResult);
      const publishedPriceBefore =
        candidate.publishedPriceNmBefore ??
        publishedPriceRowsByCardPrintId.get(cardPrintId)?.priceNm ??
        null;

      results.push({
        cardPrintId,
        externalProductId: normalizeText(candidate.provider?.externalProductId),
        externalVariantId: normalizeText(candidate.provider?.externalVariantId),
        tcgplayerProductId,
        justtcgPriceNm: candidate.justtcgPriceNm ?? candidate.priceNm ?? null,
        tcgplayerMarketPrice: candidate.tcgplayerMarketPrice ?? extractMarketPrice(tcgplayerDetail),
        publishedPriceNmBefore: publishedPriceBefore,
        priceDeltaAbs: priceDrift.priceDeltaAbs,
        priceDeltaRatio: priceDrift.priceDeltaRatio,
        mappingIntegrityStatus: mappingResult.mappingIntegrityStatus,
        labelIntegrityStatus: displayFields.labelStatus,
        verificationStatus,
        reason:
          verificationStatus === "mapping_conflict"
            ? mappingResult.primaryConflictType || "mapping_conflict"
            : priceDrift.reason,
        checkedAt,
        rawTcgplayerPayload: tcgplayerDetail,
      });

      for (const conflict of mappingResult.conflicts) {
        conflicts.push(coerceConflictRecord(candidate, conflict));
      }

      publishableCandidates.push(
        buildPublishableCandidate(
          {
            ...candidate,
            conflictTypes: mappingResult.conflictTypes,
          },
          verificationStatus,
          displayFields,
        ),
      );
    }

    if (typeof adapter.insertVerificationResults === "function") {
      await adapter.insertVerificationResults(verificationRunId, results);
    } else if (typeof adapter.upsertVerificationResults === "function") {
      await adapter.upsertVerificationResults(results);
    } else {
      throw new Error("verification adapter is missing an insertVerificationResults/upsertVerificationResults method");
    }
    if (conflicts.length) {
      await adapter.recordConflicts(verificationRunId, conflicts);
    }

    return {
      verificationRunId,
      results,
      conflicts,
      publishableCandidates,
    };
  } catch (error) {
    const finishedAt = now();
    const message = error instanceof Error ? error.message : String(error);
    await adapter.markRunFailed(verificationRunId, finishedAt, message);
    throw error;
  }
}

export async function verifyPricingRefresh(options) {
  const result = await runPricingVerification(options);
  const adapter = options?.adapter;
  if (adapter?.markRunCompleted) {
    const finishedAt = options?.now ? options.now() : new Date().toISOString();
    await adapter.markRunCompleted(result.verificationRunId, finishedAt);
  }
  return result;
}

function buildInsertValues(rows, columns, startingIndex = 1) {
  const params = [];
  const valuesSql = rows
    .map((row, rowIndex) => {
      const placeholders = columns.map((column, columnIndex) => {
        params.push(row[column]);
        return `$${startingIndex + rowIndex * columns.length + columnIndex}`;
      });
      return `(${placeholders.join(", ")})`;
    })
    .join(", ");
  return { params, valuesSql };
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map((entry) => String(entry));
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.filter(Boolean).map((entry) => String(entry)) : [];
  } catch {
    return [];
  }
}

export async function createPostgresVerificationAdapter(sql) {
  const postgresModule = await loadPostgresModule();
  const postgresClient = sql ?? postgresModule.createPostgresClient();

  return {
    async createVerificationRun(source, notes, startedAt) {
      const rows = await postgresClient.unsafe(
        `
          insert into pricing_verification_runs (status, started_at, source, notes)
          values ('running', $1::timestamptz, $2, $3)
          returning id
        `,
        [startedAt, source, notes],
      );
      return Number(rows[0]?.id);
    },
    async insertVerificationResults(verificationRunId, results) {
      if (!results.length) return;
      const columns = [
        "cardPrintId",
        "externalProductId",
        "externalVariantId",
        "tcgplayerProductId",
        "justtcgPriceNm",
        "tcgplayerMarketPrice",
        "publishedPriceNmBefore",
        "priceDeltaAbs",
        "priceDeltaRatio",
        "mappingIntegrityStatus",
        "labelIntegrityStatus",
        "verificationStatus",
        "reason",
        "checkedAt",
        "rawTcgplayerPayload",
      ];
      const rows = results.map((row) => ({
        ...row,
      }));
      const payload = rows.map((row) => ({ ...row, verificationRunId }));
      const insertColumns = ["verificationRunId", ...columns];
      const { params, valuesSql } = buildInsertValues(payload, insertColumns);
      await postgresClient.unsafe(
        `
          insert into pricing_verification_results
            (verification_run_id, card_print_id, external_product_id, external_variant_id, tcgplayer_product_id, justtcg_price_nm, tcgplayer_market_price, published_price_nm_before, price_delta_abs, price_delta_ratio, mapping_integrity_status, label_integrity_status, verification_status, reason, checked_at, raw_tcgplayer_payload)
          values ${valuesSql}
          on conflict (verification_run_id, card_print_id) do update
          set
            external_product_id = excluded.external_product_id,
            external_variant_id = excluded.external_variant_id,
            tcgplayer_product_id = excluded.tcgplayer_product_id,
            justtcg_price_nm = excluded.justtcg_price_nm,
            tcgplayer_market_price = excluded.tcgplayer_market_price,
            published_price_nm_before = excluded.published_price_nm_before,
            price_delta_abs = excluded.price_delta_abs,
            price_delta_ratio = excluded.price_delta_ratio,
            mapping_integrity_status = excluded.mapping_integrity_status,
            label_integrity_status = excluded.label_integrity_status,
            verification_status = excluded.verification_status,
            reason = excluded.reason,
            checked_at = excluded.checked_at,
            raw_tcgplayer_payload = excluded.raw_tcgplayer_payload
        `,
        params,
      );
    },
    async recordConflicts(verificationRunId, conflicts) {
      if (!conflicts.length) return;
      const payload = conflicts.map((conflict) => ({
        verificationRunId,
        ...conflict,
      }));
      const columns = [
        "verificationRunId",
        "cardPrintId",
        "externalProductId",
        "externalVariantId",
        "tcgplayerProductId",
        "conflictType",
        "expectedNumber",
        "expectedSetCode",
        "expectedName",
        "providerNumber",
        "providerSetName",
        "providerProductName",
        "details",
      ];
      const { params, valuesSql } = buildInsertValues(payload, columns);
      await postgresClient.unsafe(
        `
          insert into pricing_mapping_conflicts
            (verification_run_id, card_print_id, external_product_id, external_variant_id, tcgplayer_product_id, conflict_type, expected_number, expected_set_code, expected_name, provider_number, provider_set_name, provider_product_name, details)
          values ${valuesSql}
        `,
        params,
      );
    },
    async markRunFailed(verificationRunId, finishedAt, notes) {
      await postgresClient.unsafe(
        `
          update pricing_verification_runs
          set status = 'failed',
              finished_at = $2::timestamptz,
              notes = coalesce($3, notes)
          where id = $1
        `,
        [verificationRunId, finishedAt, notes],
      );
    },
    async loadVerificationCandidates({ cardPrintIds = [], limit = null } = {}) {
      const rows = await postgresClient.unsafe(
        `
          select
            cp.id as "cardPrintId",
            coalesce(current_prices.source_id, $1) as "sourceId",
            coalesce(current_prices.external_product_id, cp.active_external_product_id) as "externalProductId",
            coalesce(current_prices.external_variant_id, cp.active_external_variant_id) as "externalVariantId",
            current_prices.price_market as "priceMarket",
            current_prices.price_nm as "priceNm",
            current_prices.price_lp as "priceLp",
            coalesce(variant.last_updated_at, current_prices.updated_at)::text as "providerUpdatedAt",
            current_prices.updated_at::text as "updatedAt",
            cards.number as "cardNumber",
            cards.set_code as "cardSetCode",
            releases.name as "cardSetName",
            releases.code as "releaseCode",
            cards.name as "cardTitle",
            cards.rarity as "cardRarity",
            cp.variant_label as "cardTreatmentLabel",
            cp.image_url as "cardImageUrl",
            ep.name as "providerProductName",
            ep.set_name as "providerSetName",
            ep.number as "providerNumber",
            ep.image_url as "providerImageUrl",
            coalesce(ep.raw_payload->>'productUrlName', ep.product_url) as "providerProductUrlName",
            coalesce(ep.raw_payload->>'tcgplayerId', ep.raw_payload->>'tcgplayer_id') as "tcgplayerProductId",
            published.price_nm as "publishedPriceNmBefore",
            display.display_title as "publishedDisplayTitle",
            display.display_set_name as "publishedDisplaySetName",
            display.display_set_code as "publishedDisplaySetCode",
            display.display_rarity as "publishedDisplayRarity",
            display.display_treatment_label as "publishedDisplayTreatmentLabel",
            display.display_image_url as "publishedDisplayImageUrl",
            display.label_status as "publishedDisplayLabelStatus",
            (
              select json_agg(other.id order by other.id)
              from card_prints other
              where other.active_external_variant_id = coalesce(current_prices.external_variant_id, cp.active_external_variant_id)
                and other.active_external_variant_id is not null
            ) as "duplicateVariantCardPrintIds",
            (
              select json_agg(other.id order by other.id)
              from card_prints other
              where other.active_external_product_id = coalesce(current_prices.external_product_id, cp.active_external_product_id)
                and other.active_external_product_id is not null
            ) as "duplicateProductCardPrintIds"
          from card_prints cp
          join cards on cards.id = cp.card_id
          join releases on releases.id = cp.release_id
          left join card_print_price_current current_prices
            on current_prices.card_print_id = cp.id
           and current_prices.source_id = $1
          left join external_products ep
            on ep.id = coalesce(current_prices.external_product_id, cp.active_external_product_id)
          left join external_product_variants variant
            on variant.id = coalesce(current_prices.external_variant_id, cp.active_external_variant_id)
           and variant.external_product_id = coalesce(current_prices.external_product_id, cp.active_external_product_id)
          left join card_print_price_published published
            on published.card_print_id = cp.id
           and published.source_id = $1
          left join card_print_display_published display
            on display.card_print_id = cp.id
          where cp.is_active = true
            and (
              current_prices.card_print_id is not null
              or cp.active_external_product_id is not null
            )
            and ($2::text[] is null or cp.id = any($2::text[]))
          order by cp.id
          limit coalesce($3::int, 2147483647)
        `,
        [JUSTTCG_SOURCE_ID, cardPrintIds.length ? cardPrintIds : null, limit],
      );

      return rows.map((row) => ({
        sourceId: row.sourceId,
        priceMarket: row.priceMarket == null ? null : Number(row.priceMarket),
        justtcgPriceNm: row.priceNm == null ? null : Number(row.priceNm),
        priceLp: row.priceLp == null ? null : Number(row.priceLp),
        providerUpdatedAt: row.providerUpdatedAt,
        updatedAt: row.updatedAt,
        publishedPriceNmBefore: row.publishedPriceNmBefore == null ? null : Number(row.publishedPriceNmBefore),
        cardPrint: {
          id: row.cardPrintId,
          number: row.cardNumber,
          setCode: row.cardSetCode,
          setName: row.cardSetName,
          releaseCode: row.releaseCode,
          title: row.cardTitle,
          rarity: row.cardRarity,
          treatmentLabel: row.cardTreatmentLabel,
          imageUrl: row.cardImageUrl,
        },
        provider: {
          externalProductId: row.externalProductId,
          externalVariantId: row.externalVariantId,
          tcgplayerProductId: row.tcgplayerProductId,
          productName: row.providerProductName,
          productUrlName: row.providerProductUrlName,
          setName: row.providerSetName,
          number: row.providerNumber,
          treatment: null,
          imageUrl: row.providerImageUrl,
        },
        publishedDisplay: row.publishedDisplayTitle
          ? {
              displayTitle: row.publishedDisplayTitle,
              displaySetName: row.publishedDisplaySetName,
              displaySetCode: row.publishedDisplaySetCode,
              displayRarity: row.publishedDisplayRarity,
              displayTreatmentLabel: row.publishedDisplayTreatmentLabel,
              displayImageUrl: row.publishedDisplayImageUrl,
              labelStatus: row.publishedDisplayLabelStatus,
            }
          : null,
        duplicateVariantCardPrintIds: parseJsonArray(row.duplicateVariantCardPrintIds),
        duplicateProductCardPrintIds: parseJsonArray(row.duplicateProductCardPrintIds),
      }));
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const adapter = await createPostgresVerificationAdapter();
  const candidates = await adapter.loadVerificationCandidates({
    cardPrintIds: args.cardPrintIds,
    limit: args.limit,
  });
  const result = await runPricingVerification({
    source: args.source,
    candidates,
    adapter,
    cachePath: args.cachePath,
  });

  const blockedCount = result.results.filter((row) => row.verificationStatus !== "verified" && row.verificationStatus !== "drift_warning").length;
  console.log(
    JSON.stringify(
      {
        verificationRunId: result.verificationRunId,
        checked: result.results.length,
        blocked: blockedCount,
        publishable: result.publishableCandidates.filter(
          (candidate) => candidate.verificationStatus === "verified" || candidate.verificationStatus === "drift_warning",
        ).length,
      },
      null,
      2,
    ),
  );
}

const isDirectRun = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  });
}
