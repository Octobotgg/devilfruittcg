export const MATCHUP_CONFIDENCE_MINIMUM = 100;

export type MatchupRelevanceCandidate = {
  cardId: string;
  presence: number;
  performance: number;
  confidence: number;
};

export type MatchupRelevanceScore = MatchupRelevanceCandidate & {
  presenceNorm: number;
  performanceNorm: number;
  confidenceNorm: number;
  finalScore: number;
};

export type GumgumLeaderCandidate = {
  cardId: string;
  metaShare: number;
  sampleGames: number;
};

export function selectGumgumDrivenMatchupLeaders(
  candidates: GumgumLeaderCandidate[],
  limit: number,
): string[] {
  return [...candidates]
    .sort(
      (a, b) =>
        b.sampleGames - a.sampleGames ||
        b.metaShare - a.metaShare ||
        a.cardId.localeCompare(b.cardId),
    )
    .slice(0, limit)
    .map((candidate) => candidate.cardId);
}

export function selectRelevantMatchupLeaders(
  candidates: MatchupRelevanceCandidate[],
  limit: number,
  minimumConfidence = MATCHUP_CONFIDENCE_MINIMUM,
): MatchupRelevanceScore[] {
  const eligible = candidates.filter(
    (candidate) =>
      Number.isFinite(candidate.presence) &&
      Number.isFinite(candidate.performance) &&
      Number.isFinite(candidate.confidence) &&
      candidate.confidence >= minimumConfidence,
  );

  if (!eligible.length) return [];

  const maxPresence = Math.max(...eligible.map((candidate) => candidate.presence), 1);
  const minPerformance = Math.min(...eligible.map((candidate) => candidate.performance));
  const maxPerformance = Math.max(...eligible.map((candidate) => candidate.performance));
  const performanceSpan = Math.max(0.0001, maxPerformance - minPerformance);
  const maxConfidenceLog = Math.max(...eligible.map((candidate) => Math.log1p(candidate.confidence)), 1);

  return eligible
    .map((candidate) => {
      const presenceNorm = candidate.presence / maxPresence;
      const performanceNorm = (candidate.performance - minPerformance) / performanceSpan;
      const confidenceNorm = Math.log1p(candidate.confidence) / maxConfidenceLog;
      const finalScore = Number(
        (
          presenceNorm * 0.55 +
          performanceNorm * 0.3 +
          confidenceNorm * 0.15
        ).toFixed(6),
      );

      return {
        ...candidate,
        presenceNorm: Number(presenceNorm.toFixed(6)),
        performanceNorm: Number(performanceNorm.toFixed(6)),
        confidenceNorm: Number(confidenceNorm.toFixed(6)),
        finalScore,
      };
    })
    .sort(
      (a, b) =>
        b.finalScore - a.finalScore ||
        b.presence - a.presence ||
        b.performance - a.performance ||
        b.confidence - a.confidence ||
        a.cardId.localeCompare(b.cardId),
    )
    .slice(0, limit);
}
