import { createRequire } from "node:module";

import type { SealedProductPriceRow, SealedProductRuntimePrice } from "./external-products";

const require = createRequire(import.meta.url);
if (process.env.NODE_ENV !== "test") {
  require("server-only");
}
const pricingShared = require("./external-products.ts") as typeof import("./external-products");

export type { SealedProductPriceRow, SealedProductRuntimePrice } from "./external-products";

export type LoadSealedProductPriceRows = (
  sealedProductIds: string[],
) => Promise<SealedProductPriceRow[]>;

function indexRowsBySealedProductId(rows: SealedProductPriceRow[]) {
  const indexed = new Map<string, SealedProductPriceRow>();

  for (const row of rows) {
    if (!indexed.has(row.sealedProductId)) {
      indexed.set(row.sealedProductId, row);
    }
  }

  return indexed;
}

export function resolveSealedProductRuntimePrice(
  sealedProductId: string,
  row: SealedProductPriceRow | null | undefined,
): SealedProductRuntimePrice {
  if (!row || !row.externalProductId || !row.mappingApproved) {
    return pricingShared.createUnpricedSealedProductPrice(
      sealedProductId,
      "missing_active_approved_mapping",
    );
  }

  if (pricingShared.normalizeProductKind(row.productKind) !== "sealed") {
    return pricingShared.createUnpricedSealedProductPrice(sealedProductId, "kind_mismatch");
  }

  const currentPrice = pricingShared.parseNullableNumber(row.priceMarket);
  if (currentPrice == null) {
    return pricingShared.createUnpricedSealedProductPrice(
      sealedProductId,
      "missing_current_price",
    );
  }

  return {
    status: "priced",
    kind: "sealed",
    sealedProductId,
    currency: pricingShared.USD_CURRENCY,
    currentPrice,
    currentPriceType: "market",
    priceChange24h: pricingShared.parseNullableNumber(row.priceChange24h),
    updatedAt: row.updatedAt,
    fetchedAt: row.fetchedAt,
    externalProductId: row.externalProductId,
    justtcg: {
      title: row.justtcgTitle,
      imageUrl: row.justtcgImageUrl,
    },
    official: {
      name: row.sealedProductName,
      releaseCode: row.officialReleaseCode,
      releaseName: row.officialReleaseName,
    },
  };
}

export async function getSealedProductRuntimePrice(
  sealedProductId: string,
  options?: {
    loadRows?: LoadSealedProductPriceRows;
  },
): Promise<SealedProductRuntimePrice> {
  const loadRows = options?.loadRows ?? pricingShared.loadSealedProductPriceRows;
  const rows = await loadRows([sealedProductId]);
  const row = rows.find((candidate) => candidate.sealedProductId === sealedProductId) || null;

  return resolveSealedProductRuntimePrice(sealedProductId, row);
}

export async function getSealedProductRuntimePrices(
  sealedProductIds: string[],
  options?: {
    loadRows?: LoadSealedProductPriceRows;
  },
): Promise<Map<string, SealedProductRuntimePrice>> {
  const loadRows = options?.loadRows ?? pricingShared.loadSealedProductPriceRows;
  const rows = await loadRows(sealedProductIds);
  const indexedRows = indexRowsBySealedProductId(rows);
  const results = new Map<string, SealedProductRuntimePrice>();

  for (const sealedProductId of new Set(sealedProductIds.map((id) => id.trim()).filter(Boolean))) {
    results.set(
      sealedProductId,
      resolveSealedProductRuntimePrice(sealedProductId, indexedRows.get(sealedProductId)),
    );
  }

  return results;
}
