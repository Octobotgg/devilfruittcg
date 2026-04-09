export type DeckOverviewSummaryInput = {
  mainDeckCount: number;
  leaderName: string | null;
  leaderSubtitle: string | null;
  deckValue: number;
  deckValueStatus: string;
  legal: boolean;
};

export type DeckOverviewSummaryCard = {
  key: "deck_value" | "deck_size" | "status";
  label: string;
  value: string;
  detail: string;
  tone: "gold" | "navy" | "amber" | "emerald";
};

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function buildLeaderDetail(leaderName: string | null, leaderSubtitle: string | null) {
  const nextLeaderName = String(leaderName || "").trim();
  if (!nextLeaderName) return "Pick a leader to anchor the build";

  const nextLeaderSubtitle = String(leaderSubtitle || "").trim();
  return nextLeaderSubtitle ? `${nextLeaderName} · ${nextLeaderSubtitle}` : `${nextLeaderName} · Leader set`;
}

export function buildDeckOverviewSummary(
  input: DeckOverviewSummaryInput,
): DeckOverviewSummaryCard[] {
  return [
    {
      key: "deck_value",
      label: "Deck Value",
      value: USD_FORMATTER.format(input.deckValue),
      detail: input.deckValueStatus,
      tone: "gold",
    },
    {
      key: "deck_size",
      label: "Deck Size",
      value: `${input.mainDeckCount}/50`,
      detail: "Leader counted separately",
      tone: "navy",
    },
    {
      key: "status",
      label: "Status",
      value: input.legal ? "Deck Legal" : "Needs tuning",
      detail: buildLeaderDetail(input.leaderName, input.leaderSubtitle),
      tone: input.legal ? "emerald" : "amber",
    },
  ];
}
