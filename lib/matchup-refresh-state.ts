import type { MatchIntelPeriod } from "@/lib/analytics/types";

type MatchupRefreshTarget = {
  period: string;
  setCode: string;
  deckLimit: number;
};

const PERIOD_LABELS: Record<MatchIntelPeriod, string> = {
  west: "West (All)",
  lw: "Last Week (All)",
  east: "East (All)",
  east_lw: "East · Last Week (All)",
  west_p: "West (Private)",
  lw_p: "Last Week (Private)",
  east_p: "East (Private)",
  east_lw_p: "East · Last Week (Private)",
};

export function getMatchupPeriodLabel(period: string): string {
  return PERIOD_LABELS[period as MatchIntelPeriod] ?? period.trim().toUpperCase();
}

export function getMatchupRefreshTargetLabel({ period, setCode, deckLimit }: MatchupRefreshTarget): string {
  return `${getMatchupPeriodLabel(period)} · ${setCode} · Top ${deckLimit}`;
}

export function getMatchupRefreshCopy(target: MatchupRefreshTarget) {
  const targetLabel = getMatchupRefreshTargetLabel(target);
  return {
    title: "Refreshing matchup matrix",
    subtitle: `Charting ${targetLabel}`,
    ariaLabel: `Refreshing matchup matrix for ${targetLabel.replaceAll(" · ", ", ")}`,
  };
}
