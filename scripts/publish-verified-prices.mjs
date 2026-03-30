#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const JUSTTCG_SOURCE_ID = "justtcg";

async function loadPricingPublisherModule() {
  return import(pathToFileURL(path.join(ROOT, "lib/server/pricing/pricing-publisher.ts")).href);
}

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
    verificationRunId: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--verification-run-id") {
      const parsed = Number.parseInt(String(argv[index + 1] || ""), 10);
      args.verificationRunId = Number.isFinite(parsed) ? parsed : null;
      index += 1;
    }
  }

  return args;
}

function mergePublishDisplay(row, computedDisplay) {
  const publishedDisplay = row.publishedDisplay || {};
  return {
    displaySetName:
      normalizeText(publishedDisplay.displaySetName) ||
      normalizeText(computedDisplay.displaySetName) ||
      normalizeText(row.cardPrint.setName),
    displaySetCode:
      normalizeText(publishedDisplay.displaySetCode) ||
      normalizeText(computedDisplay.displaySetCode) ||
      normalizeText(row.cardPrint.setCode),
    displayRarity:
      normalizeText(publishedDisplay.displayRarity) ||
      normalizeText(computedDisplay.displayRarity) ||
      normalizeText(row.cardPrint.rarity),
    displayTitle:
      normalizeText(publishedDisplay.displayTitle) ||
      normalizeText(computedDisplay.displayTitle) ||
      normalizeText(row.cardPrint.title),
    displayTreatmentLabel:
      normalizeText(publishedDisplay.displayTreatmentLabel) ||
      normalizeText(computedDisplay.displayTreatmentLabel),
    displayImageUrl:
      normalizeText(publishedDisplay.displayImageUrl) ||
      normalizeText(computedDisplay.displayImageUrl) ||
      normalizeText(row.cardPrint.imageUrl),
    labelStatus:
      row.labelIntegrityStatus === "blocked"
        ? "blocked"
        : publishedDisplay.labelStatus || computedDisplay.labelStatus || "fallback",
  };
}

function toPublishCandidate(row, buildPublishedDisplayPayload) {
  if (!row.cardPrint || !row.provider) {
    return row;
  }
  const computedDisplay = buildPublishedDisplayPayload({
    cardPrint: row.cardPrint,
    provider: row.provider,
  });
  const display = mergePublishDisplay(row, computedDisplay);

  return {
    cardPrintId: row.cardPrint.id,
    sourceId: row.sourceId || JUSTTCG_SOURCE_ID,
    externalProductId: normalizeText(row.provider.externalProductId),
    externalVariantId: normalizeText(row.provider.externalVariantId),
    verificationStatus: row.verificationStatus,
    conflictTypes: row.conflictTypes || [],
    priceMarket: row.justtcgPriceNm ?? row.priceMarket ?? null,
    priceNm: row.justtcgPriceNm ?? null,
    priceLp: row.verifiedCheckedAt ? null : row.priceLp ?? null,
    updatedAt: row.verifiedCheckedAt ?? row.checkedAt ?? row.providerUpdatedAt ?? row.updatedAt ?? null,
    displaySetName: display.displaySetName,
    displaySetCode: display.displaySetCode,
    displayRarity: display.displayRarity,
    displayTitle: display.displayTitle,
    displayTreatmentLabel: display.displayTreatmentLabel,
    displayImageUrl: display.displayImageUrl,
    labelStatus: display.labelStatus,
    officialName: row.cardPrint.title ?? null,
    officialSetName: row.cardPrint.setName ?? null,
    officialSetCode: row.cardPrint.setCode ?? null,
    officialRarity: row.cardPrint.rarity ?? null,
  };
}

export async function publishVerifiedPrices(options) {
  const { publishPricingVerificationRun } = await loadPricingPublisherModule();
  return publishPricingVerificationRun({
    verificationRunId: options.verificationRunId,
    candidates: options.candidates,
    adapter: options.adapter,
    now: options.now,
  });
}

export async function publishVerifiedPricingRun(options) {
  const adapter = options?.adapter;
  if (!adapter || typeof adapter.loadPublishCandidates !== "function") {
    throw new Error("publishVerifiedPricingRun requires an adapter with loadPublishCandidates");
  }
  const verificationRunId = options?.verificationRunId ?? (await adapter.loadLatestVerificationRunId?.());
  if (!verificationRunId) {
    throw new Error("No verification run available to publish");
  }

  const rawCandidates = await adapter.loadPublishCandidates(verificationRunId);
  if (!rawCandidates.length) {
    if (adapter?.markRunCompleted) {
      const finishedAt = options?.now ? options.now() : new Date().toISOString();
      await adapter.markRunCompleted(verificationRunId, finishedAt);
    }
    return {
      verificationRunId,
      publishedCount: 0,
    };
  }

  const { buildPublishedDisplayPayload } = await loadPricingVerifierModule();
  const candidates = rawCandidates.map((row) => toPublishCandidate(row, buildPublishedDisplayPayload));
  await publishVerifiedPrices({
    verificationRunId,
    candidates,
    adapter,
    now: options?.now,
  });

  return {
    verificationRunId,
    publishedCount: candidates.length,
  };
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

export async function createPostgresPublishAdapter(sql) {
  const { createPostgresPricingPublisherAdapter } = await loadPricingPublisherModule();
  const postgresModule = await loadPostgresModule();
  const postgresClient = sql ?? postgresModule.createPostgresClient();
  const publisherAdapter = createPostgresPricingPublisherAdapter(postgresClient);

  return {
    ...publisherAdapter,
    async loadLatestVerificationRunId() {
      const rows = await postgresClient.unsafe(
        `
          select id
          from pricing_verification_runs
          where status = 'running'
          order by started_at desc, id desc
          limit 1
        `,
      );
      return Number(rows[0]?.id || 0) || null;
    },
    async loadPublishCandidates(verificationRunId) {
      const rows = await postgresClient.unsafe(
        `
          select
            vr.card_print_id as "cardPrintId",
            vr.verification_status as "verificationStatus",
            vr.label_integrity_status as "labelIntegrityStatus",
            vr.justtcg_price_nm as "justtcgPriceNm",
            vr.tcgplayer_market_price as "tcgplayerMarketPrice",
            vr.checked_at::text as "verifiedCheckedAt",
            current_prices.price_market as "priceMarket",
            current_prices.price_lp as "priceLp",
            coalesce(variant.last_updated_at, current_prices.updated_at)::text as "providerUpdatedAt",
            current_prices.updated_at::text as "updatedAt",
            cards.number as "cardNumber",
            cards.set_code as "cardSetCode",
            releases.name as "cardSetName",
            cards.name as "cardTitle",
            cards.rarity as "cardRarity",
            cp.variant_label as "cardTreatmentLabel",
            cp.image_url as "cardImageUrl",
            ep.id as "externalProductId",
            variant.id as "externalVariantId",
            coalesce(ep.raw_payload->>'tcgplayerId', ep.raw_payload->>'tcgplayer_id', vr.tcgplayer_product_id) as "tcgplayerProductId",
            ep.name as "providerProductName",
            coalesce(ep.raw_payload->>'productUrlName', ep.product_url) as "providerProductUrlName",
            ep.set_name as "providerSetName",
            ep.number as "providerNumber",
            ep.image_url as "providerImageUrl",
            display.display_title as "publishedDisplayTitle",
            display.display_set_name as "publishedDisplaySetName",
            display.display_set_code as "publishedDisplaySetCode",
            display.display_rarity as "publishedDisplayRarity",
            display.display_treatment_label as "publishedDisplayTreatmentLabel",
            display.display_image_url as "publishedDisplayImageUrl",
            display.label_status as "publishedDisplayLabelStatus",
            (
              select json_agg(conflict_type order by conflict_type)
              from pricing_mapping_conflicts conflicts
              where conflicts.verification_run_id = vr.verification_run_id
                and conflicts.card_print_id = vr.card_print_id
            ) as "conflictTypes"
          from pricing_verification_results vr
          join card_prints cp on cp.id = vr.card_print_id
          join cards on cards.id = cp.card_id
          join releases on releases.id = cp.release_id
          left join card_print_price_current current_prices
            on current_prices.card_print_id = vr.card_print_id
           and current_prices.source_id = $2
          left join external_products ep
            on ep.id = coalesce(vr.external_product_id, current_prices.external_product_id, cp.active_external_product_id)
          left join external_product_variants variant
            on variant.id = coalesce(vr.external_variant_id, current_prices.external_variant_id, cp.active_external_variant_id)
           and variant.external_product_id = ep.id
          left join card_print_display_published display
            on display.card_print_id = vr.card_print_id
          where vr.verification_run_id = $1
          order by vr.card_print_id
        `,
        [verificationRunId, JUSTTCG_SOURCE_ID],
      );

      return rows.map((row) => ({
        sourceId: JUSTTCG_SOURCE_ID,
        verificationStatus: row.verificationStatus,
        labelIntegrityStatus: row.labelIntegrityStatus,
        justtcgPriceNm: row.justtcgPriceNm == null ? null : Number(row.justtcgPriceNm),
        tcgplayerMarketPrice: row.tcgplayerMarketPrice == null ? null : Number(row.tcgplayerMarketPrice),
        verifiedCheckedAt: row.verifiedCheckedAt,
        priceMarket: row.priceMarket == null ? null : Number(row.priceMarket),
        priceLp: row.priceLp == null ? null : Number(row.priceLp),
        providerUpdatedAt: row.providerUpdatedAt,
        updatedAt: row.updatedAt,
        conflictTypes: parseJsonArray(row.conflictTypes),
        cardPrint: {
          id: row.cardPrintId,
          number: row.cardNumber,
          setCode: row.cardSetCode,
          setName: row.cardSetName,
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
      }));
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const adapter = await createPostgresPublishAdapter();
  const result = await publishVerifiedPricingRun({
    verificationRunId: args.verificationRunId,
    adapter,
  });

  console.log(JSON.stringify(result, null, 2));
}

const isDirectRun = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  });
}
