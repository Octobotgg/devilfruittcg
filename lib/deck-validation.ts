import type { Deck } from "@/lib/cloud/types";
import type { Card } from "@/lib/cards";
import { parseLeaderColors } from "@/lib/theme/color-utils";

export type DeckFormatId = "standard" | "extra";

export type DeckValidationIssue = {
  code: string;
  message: string;
};

export type DeckValidationResult = {
  format: DeckFormatId;
  legal: boolean;
  issues: DeckValidationIssue[];
  summary: {
    leaderCount: number;
    mainDeckCount: number;
    donDeckCount: number;
    totalCopies: number;
  };
};

type FormatRule = {
  id: DeckFormatId;
  label: string;
  description: string;
  effectiveDate?: string;
  allowedBlocks: string[] | null;
};

export const DON_DECK_SIZE = 10;

export const DECK_FORMAT_RULES: Record<DeckFormatId, FormatRule> = {
  standard: {
    id: "standard",
    label: "Standard",
    description: "Blocks 2-5 only. Official Standard Regulation starts on April 1, 2026.",
    effectiveDate: "April 1, 2026",
    allowedBlocks: ["2", "3", "4", "5"],
  },
  extra: {
    id: "extra",
    label: "Extra (Unlimited)",
    description: "All blocks currently in the official English card pool.",
    allowedBlocks: null,
  },
};

// Official restriction page checked against the English Bandai site on March 8, 2026.
const BANNED_CARD_IDS = ["OP03-040", "OP05-041", "OP06-086", "ST10-001"] as const;

const PAIRED_BAN_GROUPS = [
  ["OP01-067", "OP02-117"],
  ["OP08-069", "OP11-040"],
] as const;

const RESTRICTED_CARD_LIMITS: Record<string, number> = {};

function normalizeId(id: string | null | undefined) {
  return String(id || "").trim().toUpperCase();
}

function formatCardLabel(card: Card | undefined, cardId: string) {
  return `${card?.name || cardId} [${card?.id || cardId}]`;
}

function getCardBlockIcon(card: Card | undefined) {
  const block = card?.blockIcon;
  return block == null ? "" : String(block).trim();
}

export function validateDeckAgainstFormat(
  deck: Deck,
  cardsById: Map<string, Card>,
  format: DeckFormatId,
): DeckValidationResult {
  const issues: DeckValidationIssue[] = [];
  const rules = DECK_FORMAT_RULES[format];
  const mainDeckCount = deck.cards.reduce((sum, entry) => sum + entry.quantity, 0);
  const leaderId = normalizeId(deck.leaderId);
  const leaderCard = leaderId ? cardsById.get(leaderId) : undefined;
  const leaderColors = parseLeaderColors(leaderCard?.color || "");
  const leaderCount = leaderId ? 1 : 0;
  const allDeckIds = new Set<string>(leaderId ? [leaderId] : []);

  if (!leaderId) {
    issues.push({ code: "leader_missing", message: "Exactly 1 Leader card is required." });
  } else if (!leaderCard) {
    issues.push({ code: "leader_loading", message: `Leader data is still loading for ${leaderId}.` });
  } else if (leaderCard.type !== "Leader") {
    issues.push({ code: "leader_type", message: `${formatCardLabel(leaderCard, leaderId)} is not a Leader card.` });
  }

  if (mainDeckCount !== 50) {
    issues.push({
      code: "main_deck_count",
      message: `${mainDeckCount} cards in the main deck. Official deck construction requires exactly 50.`,
    });
  }

  if (DON_DECK_SIZE !== 10) {
    issues.push({
      code: "don_deck_count",
      message: `${DON_DECK_SIZE} DON!! cards configured. Official deck construction requires exactly 10.`,
    });
  }

  for (const entry of deck.cards) {
    const cardId = normalizeId(entry.cardId);
    const card = cardsById.get(cardId);
    allDeckIds.add(cardId);

    if (!card) {
      issues.push({ code: "card_loading", message: `Card data is still loading for ${cardId}.` });
      continue;
    }

    if (entry.quantity > 4) {
      issues.push({
        code: "copy_limit",
        message: `${entry.quantity} copies of ${formatCardLabel(card, cardId)}. The maximum is 4.`,
      });
    }

    const restrictedLimit = RESTRICTED_CARD_LIMITS[cardId];
    if (restrictedLimit !== undefined && entry.quantity > restrictedLimit) {
      issues.push({
        code: "restricted_card",
        message: `${entry.quantity} copies of ${formatCardLabel(card, cardId)}. The current restricted limit is ${restrictedLimit}.`,
      });
    }

    if (leaderColors.length) {
      const cardColors = parseLeaderColors(card.color || "");
      const sharesLeaderColor = cardColors.some((color) => leaderColors.includes(color));
      if (!sharesLeaderColor) {
        issues.push({
          code: "color_mismatch",
          message: `${formatCardLabel(card, cardId)} does not match any of the Leader colors (${leaderColors.join("/")}).`,
        });
      }
    }

    if (rules.allowedBlocks) {
      const blockIcon = getCardBlockIcon(card);
      if (!rules.allowedBlocks.includes(blockIcon)) {
        issues.push({
          code: "format_block",
          message: `${formatCardLabel(card, cardId)} has block ${blockIcon || "unknown"} and is not legal in ${rules.label}.`,
        });
      }
    }
  }

  if (leaderCard && rules.allowedBlocks) {
    const blockIcon = getCardBlockIcon(leaderCard);
    if (!rules.allowedBlocks.includes(blockIcon)) {
      issues.push({
        code: "leader_block",
        message: `${formatCardLabel(leaderCard, leaderId)} has block ${blockIcon || "unknown"} and is not legal in ${rules.label}.`,
      });
    }
  }

  for (const bannedCardId of BANNED_CARD_IDS) {
    if (!allDeckIds.has(bannedCardId)) continue;
    const card = cardsById.get(bannedCardId);
    issues.push({
      code: "banned_card",
      message: `${formatCardLabel(card, bannedCardId)} is banned in official constructed play.`,
    });
  }

  for (const [firstId, secondId] of PAIRED_BAN_GROUPS) {
    if (!allDeckIds.has(firstId) || !allDeckIds.has(secondId)) continue;
    const firstCard = cardsById.get(firstId);
    const secondCard = cardsById.get(secondId);
    issues.push({
      code: "paired_ban",
      message: `${formatCardLabel(firstCard, firstId)} cannot be included in the same deck as ${formatCardLabel(secondCard, secondId)}.`,
    });
  }

  return {
    format,
    legal: issues.length === 0,
    issues,
    summary: {
      leaderCount,
      mainDeckCount,
      donDeckCount: DON_DECK_SIZE,
      totalCopies: mainDeckCount + leaderCount,
    },
  };
}
