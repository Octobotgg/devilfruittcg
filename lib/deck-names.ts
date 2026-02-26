export function normalizeDeckLabel(value: string): string {
  return value
    .replace(/\./g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatDeckDisplayName(leader: string, variant: string | undefined, cardId: string): string {
  const cleanLeader = normalizeDeckLabel(leader);
  const cleanVariant = normalizeDeckLabel(variant || "");
  const variantSuffix = cleanVariant && cleanVariant.toLowerCase() !== "default" ? ` (${cleanVariant})` : "";
  return `${cleanLeader}${variantSuffix} (${cardId})`;
}
