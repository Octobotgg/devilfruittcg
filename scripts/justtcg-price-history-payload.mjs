function parseFiniteNumber(value) {
  if (value == null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function defaultLogSkipped(message) {
  console.warn(message);
}

export function extractHistoryRowsFromPayload({
  cardPrintId,
  externalProductId,
  externalVariantId,
  sourceId,
  payload,
  logSkipped = defaultLogSkipped,
}) {
  if (!Array.isArray(payload)) return [];

  const rows = [];
  let skipped = 0;

  for (const point of payload) {
    const timestampSeconds = parseFiniteNumber(point?.t);
    const priceNm = parseFiniteNumber(point?.p);
    if (timestampSeconds == null || priceNm == null) {
      skipped += 1;
      continue;
    }

    rows.push({
      card_print_id: cardPrintId,
      source_id: sourceId,
      external_product_id: externalProductId,
      external_variant_id: externalVariantId,
      recorded_at: new Date(timestampSeconds * 1000).toISOString(),
      price_nm: priceNm,
      price_lp: null,
      price_market: null,
    });
  }

  if (skipped > 0) {
    logSkipped(`Skipped ${skipped} malformed JustTCG history payload points`);
  }

  return rows;
}
