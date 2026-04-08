import OFFICIAL_RELEASES_JSON from "../data/bandai-en-official-releases.json" with { type: "json" };

type OfficialReleaseRow = {
  codes?: string[];
  releaseDate?: string | null;
};

export type MatchupFormatCode = "OP15" | "EB03" | "OP14" | "OP13" | "OP12";

export type MatchupFormatWindow = {
  code: MatchupFormatCode;
  startDate: string;
  endDate: string | null;
};

type WeightedRateInput = {
  winRate: number | null;
  matches: number | null;
  priority: number;
};

const MANUAL_RELEASE_DATE_OVERRIDES: Record<MatchupFormatCode, string> = {
  OP15: "2026-04-03",
  EB03: "2026-02-20",
  OP14: "2026-01-16",
  OP13: "2025-11-07",
  OP12: "2025-08-22",
};

const SUPPORTED_MATCHUP_FORMATS: MatchupFormatCode[] = ["OP15", "EB03", "OP14", "OP13", "OP12"];

const RELEASE_DATE_BY_CODE = (() => {
  const map = new Map<string, string>();

  for (const row of OFFICIAL_RELEASES_JSON as OfficialReleaseRow[]) {
    const date = row.releaseDate || null;
    if (!date) continue;

    for (const code of row.codes || []) {
      if (!map.has(code)) map.set(code, date);
    }
  }

  for (const [code, date] of Object.entries(MANUAL_RELEASE_DATE_OVERRIDES)) {
    map.set(code, date);
  }

  return map;
})();

const MATCHUP_FORMAT_WINDOWS: MatchupFormatWindow[] = SUPPORTED_MATCHUP_FORMATS.map((code, index) => {
  const startDate = RELEASE_DATE_BY_CODE.get(code) || MANUAL_RELEASE_DATE_OVERRIDES[code];
  const previous = SUPPORTED_MATCHUP_FORMATS[index - 1];

  return {
    code,
    startDate,
    endDate: previous ? shiftDateBackOneDay(RELEASE_DATE_BY_CODE.get(previous) || MANUAL_RELEASE_DATE_OVERRIDES[previous]) : null,
  };
});

function shiftDateBackOneDay(date: string): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

function releaseDateForCode(code: string): string | null {
  return RELEASE_DATE_BY_CODE.get(code.toUpperCase()) || null;
}

function releaseCodeForCard(cardId: string): string {
  const normalized = String(cardId || "").trim().toUpperCase();
  const base = normalized.split("_")[0] || normalized;
  const match = /^(OP\d{2}|EB\d{2}|ST\d{2})-/.exec(base);
  return match?.[1] || base.split("-")[0] || "";
}

export function getSupportedMatchupFormats(): MatchupFormatCode[] {
  return [...SUPPORTED_MATCHUP_FORMATS];
}

export function getMatchupFormatWindow(code: string): MatchupFormatWindow | null {
  const normalized = code.trim().toUpperCase();
  return MATCHUP_FORMAT_WINDOWS.find((window) => window.code === normalized) || null;
}

export function getCurrentMatchupFormat(): MatchupFormatCode {
  return SUPPORTED_MATCHUP_FORMATS[0];
}

export function isCurrentMatchupFormat(code: string): boolean {
  return code.trim().toUpperCase() === getCurrentMatchupFormat();
}

export function isCardLegalInMatchupFormat(cardId: string, formatCode: string): boolean {
  const window = getMatchupFormatWindow(formatCode);
  if (!window) return false;

  const releaseCode = releaseCodeForCard(cardId);
  const releaseDate = releaseDateForCode(releaseCode);
  if (!releaseDate) return false;

  if (releaseDate < window.startDate) return true;
  if (releaseDate === window.startDate) return true;
  if (!window.endDate) return true;

  return releaseDate <= window.endDate;
}

export function mergeWeightedMatchupRate(inputs: WeightedRateInput[]) {
  const usable = inputs.filter((input) => typeof input.winRate === "number");
  if (!usable.length) return { winRate: null, matches: null };

  const allHaveCounts = usable.every((input) => typeof input.matches === "number" && (input.matches || 0) > 0);
  if (allHaveCounts) {
    const totalMatches = usable.reduce((sum, input) => sum + (input.matches || 0), 0);
    const weighted = usable.reduce((sum, input) => sum + (input.winRate || 0) * (input.matches || 0), 0);
    return {
      winRate: Number((weighted / totalMatches).toFixed(2)),
      matches: totalMatches,
    };
  }

  const best = [...usable].sort((a, b) => a.priority - b.priority)[0];
  return {
    winRate: best.winRate,
    matches: typeof best.matches === "number" ? best.matches : null,
  };
}
