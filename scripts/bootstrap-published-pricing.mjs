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

function normalizeCandidateIds(candidates) {
  return Array.from(
    new Set(
      candidates
        .filter((candidate) => candidate.currentCandidatePriced !== false)
        .map((candidate) => String(candidate.cardPrintId || "").trim())
        .filter(Boolean),
    ),
  );
}

export function reconcilePublishedCoverage({
  candidates,
  publishedPriceCardPrintIds,
  publishedDisplayCardPrintIds,
}) {
  const liveCandidateIds = normalizeCandidateIds(candidates);
  const missingPriceCoverage = liveCandidateIds.filter((cardPrintId) => !publishedPriceCardPrintIds.has(cardPrintId));
  const missingDisplayCoverage = liveCandidateIds.filter((cardPrintId) => !publishedDisplayCardPrintIds.has(cardPrintId));

  return {
    liveCandidateIds,
    missingPriceCoverage,
    missingDisplayCoverage,
    ok: missingPriceCoverage.length === 0 && missingDisplayCoverage.length === 0,
  };
}

function coverageErrorMessage(coverage) {
  const parts = [];
  if (coverage.missingPriceCoverage.length) {
    parts.push(`missing price coverage for ${coverage.missingPriceCoverage.join(", ")}`);
  }
  if (coverage.missingDisplayCoverage.length) {
    parts.push(`missing display coverage for ${coverage.missingDisplayCoverage.join(", ")}`);
  }
  return `published coverage gap: ${parts.join("; ")}`;
}

export async function bootstrapPublishedPricing(options) {
  const now = options?.now ?? (() => new Date().toISOString());
  const startedAt = now();
  const source = options?.source ?? "bootstrap-published-pricing";
  const adapter = options?.adapter;

  if (!adapter) {
    throw new Error("bootstrapPublishedPricing requires an adapter");
  }

  const explicitCandidates = Array.isArray(options?.candidates) ? options.candidates : null;
  const candidates = explicitCandidates ?? (await adapter.loadBootstrapCandidates?.()) ?? [];

  const verificationRunId =
    options?.verificationRunId ?? (await adapter.createVerificationRun(source, null, startedAt));
  const { publishPricingVerificationRun } = await loadPricingPublisherModule();

  await publishPricingVerificationRun({
    verificationRunId,
    candidates,
    adapter,
    now,
  });

  const liveCandidateIds = normalizeCandidateIds(candidates);
  const coverageSnapshot = await adapter.listPublishedCoverage(liveCandidateIds);
  const coverage = reconcilePublishedCoverage({
    candidates,
    publishedPriceCardPrintIds: coverageSnapshot.priceCardPrintIds,
    publishedDisplayCardPrintIds: coverageSnapshot.displayCardPrintIds,
  });

  if (!coverage.ok) {
    const finishedAt = now();
    const message = coverageErrorMessage(coverage);
    await adapter.markRunFailed(verificationRunId, finishedAt, message);
    throw new Error(message);
  }

  return {
    verificationRunId,
    publishedPriceCount: coverageSnapshot.priceCardPrintIds.size,
    publishedDisplayCount: coverageSnapshot.displayCardPrintIds.size,
    coverage,
  };
}

export async function createPostgresBootstrapAdapter(sql) {
  const { createPostgresPricingPublisherAdapter } = await loadPricingPublisherModule();
  const { buildPublishedDisplayPayload } = await loadPricingVerifierModule();
  const postgresModule = await import(pathToFileURL(path.join(ROOT, "db/postgres.ts")).href);
  const postgresClient = sql ?? postgresModule.createPostgresClient();
  const publisherAdapter = createPostgresPricingPublisherAdapter(postgresClient);

  return {
    ...publisherAdapter,
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
    async listPublishedCoverage(cardPrintIds) {
      const ids = Array.from(new Set(cardPrintIds.map((value) => String(value || "").trim()).filter(Boolean)));
      if (!ids.length) {
        return {
          priceCardPrintIds: new Set(),
          displayCardPrintIds: new Set(),
        };
      }

      const [priceRows, displayRows] = await Promise.all([
        postgresClient.unsafe(
          `
            select card_print_id as "cardPrintId"
            from card_print_price_published
            where source_id = $2
              and card_print_id = any($1::text[])
          `,
          [ids, JUSTTCG_SOURCE_ID],
        ),
        postgresClient.unsafe(
          `
            select card_print_id as "cardPrintId"
            from card_print_display_published
            where card_print_id = any($1::text[])
          `,
          [ids],
        ),
      ]);

      return {
        priceCardPrintIds: new Set(priceRows.map((row) => String(row.cardPrintId))),
        displayCardPrintIds: new Set(displayRows.map((row) => String(row.cardPrintId))),
      };
    },
    async loadBootstrapCandidates() {
      const rows = await postgresClient.unsafe(
        `
          select
            cp.id as "cardPrintId",
            coalesce(current_prices.source_id, $1) as "sourceId",
            coalesce(current_prices.external_product_id, cp.active_external_product_id) as "externalProductId",
            coalesce(current_prices.external_variant_id, cp.active_external_variant_id, bootstrap_variant.id) as "externalVariantId",
            coalesce(current_prices.price_market, bootstrap_variant.price) as "priceMarket",
            coalesce(current_prices.price_nm, bootstrap_variant.price) as "priceNm",
            current_prices.price_lp as "priceLp",
            coalesce(current_prices.updated_at::text, bootstrap_variant.last_updated_at::text) as "updatedAt",
            provider_product.product_kind as "productKind",
            cards.name as "officialName",
            releases.name as "officialSetName",
            releases.code as "officialSetCode",
            cards.rarity as "officialRarity",
            coalesce(display.display_set_name, releases.name) as "displaySetName",
            coalesce(display.display_set_code, releases.code) as "displaySetCode",
            coalesce(display.display_rarity, cards.rarity) as "displayRarity",
            coalesce(display.display_title, cards.name) as "displayTitle",
            coalesce(display.display_treatment_label, nullif(btrim(cp.variant_label), '')) as "displayTreatmentLabel",
            coalesce(display.display_image_url, cp.image_url) as "displayImageUrl",
            cp.variant_label as "cardPrintVariantLabel",
            cp.image_url as "cardPrintImageUrl",
            provider_product.name as "providerProductName",
            provider_product.set_name as "providerSetName",
            provider_product.image_url as "providerImageUrl",
            case
              when btrim(coalesce(cp.variant_label, '')) <> ''
                and (
                  nullif(btrim(coalesce(display.display_treatment_label, '')), '') is null
                  or (
                    display.label_status = 'fallback'::pricing_label_status
                    and nullif(btrim(coalesce(display.display_treatment_label, '')), '') = nullif(btrim(cp.variant_label), '')
                  )
                ) then
                'verified'::pricing_label_status
              else
                coalesce(display.label_status, 'fallback'::pricing_label_status)
            end as "labelStatus"
          from card_print_price_current current_prices
          right join card_prints cp on cp.id = current_prices.card_print_id
           and current_prices.source_id = $1
          join cards on cards.id = cp.card_id
          join releases on releases.id = cp.release_id
          left join lateral (
            select
              variant.id,
              variant.price,
              variant.last_updated_at
            from external_product_variants variant
            where variant.external_product_id = cp.active_external_product_id
              and lower(coalesce(variant.condition, '')) = 'near mint'
              and lower(coalesce(variant.language, '')) = 'english'
            order by variant.id asc
            limit 1
          ) bootstrap_variant on true
          left join external_products provider_product
            on provider_product.id = coalesce(current_prices.external_product_id, cp.active_external_product_id)
          left join card_print_display_published display
            on display.card_print_id = cp.id
          where cp.active_external_product_id is not null
            and coalesce(current_prices.external_product_id, cp.active_external_product_id) is not null
            and coalesce(current_prices.external_variant_id, cp.active_external_variant_id, bootstrap_variant.id) is not null
            and coalesce(current_prices.price_nm, bootstrap_variant.price) is not null
        `,
        [JUSTTCG_SOURCE_ID],
      );

      return rows.map((row) => {
        const currentTreatmentLabel = String(row.displayTreatmentLabel || "").trim() || null;
        const currentLabelStatus = row.labelStatus || "fallback";
        const cardPrintVariantLabel = String(row.cardPrintVariantLabel || "").trim() || null;
        const mirrorsInternalFallback =
          Boolean(currentTreatmentLabel) &&
          Boolean(cardPrintVariantLabel) &&
          currentTreatmentLabel === cardPrintVariantLabel;

        let displaySetName = row.displaySetName || null;
        let displaySetCode = row.displaySetCode || null;
        let displayRarity = row.displayRarity || null;
        let displayTitle = row.displayTitle || null;
        let displayTreatmentLabel = currentTreatmentLabel;
        let displayImageUrl = row.displayImageUrl || null;
        let labelStatus = currentLabelStatus;

        if (!currentTreatmentLabel || currentLabelStatus === "fallback" || mirrorsInternalFallback) {
          const computedDisplay = buildPublishedDisplayPayload({
            cardPrint: {
              title: row.officialName || null,
              setName: row.officialSetName || null,
              setCode: row.officialSetCode || null,
              rarity: row.officialRarity || null,
              imageUrl: row.cardPrintImageUrl || null,
            },
            provider: {
              productName: row.providerProductName || null,
              productUrlName: null,
              setName: row.providerSetName || null,
              treatment: null,
              imageUrl: row.providerImageUrl || null,
            },
          });

          displaySetName = computedDisplay.displaySetName || displaySetName;
          displaySetCode = computedDisplay.displaySetCode || displaySetCode;
          displayRarity = computedDisplay.displayRarity || displayRarity;
          displayTitle = computedDisplay.displayTitle || displayTitle;
          displayImageUrl = computedDisplay.displayImageUrl || displayImageUrl;
          displayTreatmentLabel = computedDisplay.displayTreatmentLabel ?? null;
          labelStatus = computedDisplay.labelStatus;
        }

        return {
          cardPrintId: String(row.cardPrintId),
          sourceId: String(row.sourceId || JUSTTCG_SOURCE_ID),
          externalProductId: row.externalProductId == null ? null : String(row.externalProductId),
          externalVariantId: row.externalVariantId == null ? null : String(row.externalVariantId),
          productKind: row.productKind || null,
          verificationStatus: "verified",
          conflictTypes: [],
          priceMarket: row.priceMarket == null ? null : Number(row.priceMarket),
          priceNm: row.priceNm == null ? null : Number(row.priceNm),
          priceLp: row.priceLp == null ? null : Number(row.priceLp),
          updatedAt: row.updatedAt || null,
          displaySetName,
          displaySetCode,
          displayRarity,
          displayTitle,
          displayTreatmentLabel,
          displayImageUrl,
          labelStatus,
          officialName: row.officialName || null,
          officialSetName: row.officialSetName || null,
          officialSetCode: row.officialSetCode || null,
          officialRarity: row.officialRarity || null,
        };
      });
    },
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const adapter = await createPostgresBootstrapAdapter();
  const result = await bootstrapPublishedPricing({
    adapter,
  });
  console.log(JSON.stringify(result, null, 2));
}
