import path from "node:path";

import { loadJson, REPO_ROOT } from "./justtcg-utils.mjs";

export const DEFAULT_PRICING_REFRESH_CONFIG_PATH = path.join(REPO_ROOT, "data", "pricing-refresh-config.json");

export function loadPricingRefreshConfig(configPath = DEFAULT_PRICING_REFRESH_CONFIG_PATH) {
  const fallback = {
    newestSets: [],
    perRunBudget: 0,
    hardStopBudget: 0,
    hotReserve: 0,
  };

  const config = loadJson(configPath, fallback);
  return {
    newestSets: Array.isArray(config?.newestSets)
      ? config.newestSets.map((value) => String(value || "").trim().toUpperCase()).filter(Boolean)
      : [],
    perRunBudget: normalizeBudget(config?.perRunBudget),
    hardStopBudget: normalizeBudget(config?.hardStopBudget),
    hotReserve: normalizeBudget(config?.hotReserve),
  };
}

function normalizeBudget(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

function normalizeCardPrintId(card) {
  return String(card?.cardPrintId || card?.card_print_id || card?.id || "").trim();
}

function normalizeSetCode(card) {
  return String(card?.setCode || card?.set_code || "").trim().toUpperCase();
}

function normalizeQueueCard(card, source) {
  const cardPrintId = normalizeCardPrintId(card);
  if (!cardPrintId) return null;
  return {
    ...card,
    cardPrintId,
    setCode: normalizeSetCode(card),
    source,
  };
}

function collatorCompare(left, right) {
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
}

function sortNewestSetCards(cards, newestSets) {
  const newestSetRanks = new Map(newestSets.map((setCode, index) => [setCode, index]));

  return [...cards].sort((left, right) => {
    const leftRank = newestSetRanks.has(left.setCode) ? newestSetRanks.get(left.setCode) : Number.POSITIVE_INFINITY;
    const rightRank = newestSetRanks.has(right.setCode) ? newestSetRanks.get(right.setCode) : Number.POSITIVE_INFINITY;

    if (leftRank !== rightRank) return leftRank - rightRank;

    const leftRelease = String(left.releaseDate || "");
    const rightRelease = String(right.releaseDate || "");
    const releaseCompare = rightRelease.localeCompare(leftRelease);
    if (releaseCompare !== 0) return releaseCompare;

    return collatorCompare(left.cardPrintId, right.cardPrintId);
  });
}

function dedupeQueue(cards) {
  const seen = new Set();
  const deduped = [];

  for (const card of cards) {
    const cardPrintId = normalizeCardPrintId(card);
    if (!cardPrintId || seen.has(cardPrintId)) continue;
    seen.add(cardPrintId);
    deduped.push(card);
  }

  return deduped;
}

function mergeQueueSegments(segments) {
  return dedupeQueue(segments.flatMap((segment) => segment));
}

export function trimQueueToBudget(queue, budget) {
  const limit = normalizeBudget(budget);
  if (!limit) return [];
  return queue.slice(0, limit);
}

export function buildScheduledRefreshQueue({
  config = loadPricingRefreshConfig(),
  newestSetCards = [],
  demandCards = [],
  deltaCards = [],
} = {}) {
  const normalizedConfig = {
    newestSets: Array.isArray(config?.newestSets)
      ? config.newestSets.map((value) => String(value || "").trim().toUpperCase()).filter(Boolean)
      : [],
    perRunBudget: normalizeBudget(config?.perRunBudget),
    hardStopBudget: normalizeBudget(config?.hardStopBudget),
    hotReserve: normalizeBudget(config?.hotReserve),
  };

  const queueBudget = Math.max(0, Math.min(normalizedConfig.perRunBudget, normalizedConfig.hardStopBudget || normalizedConfig.perRunBudget));

  const normalizedNewestCards = newestSetCards
    .map((card) => normalizeQueueCard(card, "newest"))
    .filter(Boolean)
    .filter((card) => normalizedConfig.newestSets.includes(card.setCode));

  const newestSegment = sortNewestSetCards(normalizedNewestCards, normalizedConfig.newestSets);
  const demandSegment = demandCards.map((card) => normalizeQueueCard(card, "demand")).filter(Boolean);
  const deltaSegment = deltaCards.map((card) => normalizeQueueCard(card, "delta")).filter(Boolean);

  const mergedQueue = mergeQueueSegments([newestSegment, demandSegment, deltaSegment]);
  return trimQueueToBudget(mergedQueue, queueBudget || mergedQueue.length);
}
