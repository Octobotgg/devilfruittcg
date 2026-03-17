import type { MatchEventInsert, MatchEventRow, PlayerIndexUpsert } from "@/lib/analytics/types";

export type MatchResultLabel = "Won" | "Lost" | "Draw" | "Unknown";

export interface MatchHistoryRow {
  id: string;
  date: string;
  result: MatchResultLabel;
  playerLeader: string;
  oppLeader: string;
  playerName: string | null;
  oppPlayerName: string | null;
  turnNumber: number | null;
  turnOrder: number | null;
  gameMode: number | null;
  isPrivate: boolean;
  decklist: string | null;
  oppDecklist: string | null;
}

export interface PlayerStatsSummary {
  deviceId: string;
  wins: number;
  losses: number;
  draws: number;
  matches: number;
  winRate: number;
  averageTurns: number | null;
  leaders: Array<{
    leaderId: string;
    matches: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
  }>;
}

function toIso(value: string | Date | null | undefined): string {
  if (!value) return new Date().toISOString();
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function normalizeHash(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const hash = value.trim().toLowerCase();
  if (!hash) return null;
  return hash;
}

function normalizeText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeInt(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export function normalizeMatchEventInput(source: string, raw: Record<string, unknown>): MatchEventInsert | null {
  const p1LeaderId = normalizeText(raw.p1LeaderId || raw.p1_leader_id || raw.playerLeader);
  const p2LeaderId = normalizeText(raw.p2LeaderId || raw.p2_leader_id || raw.oppLeader);
  if (!p1LeaderId || !p2LeaderId) return null;

  const winnerSideInput = normalizeInt(raw.winnerSide || raw.winner_side);
  const winnerSide = winnerSideInput === 1 || winnerSideInput === 2 ? winnerSideInput : null;

  const gameMode = normalizeInt(raw.gameMode || raw.game_mode);
  const isPrivateInput = raw.isPrivate ?? raw.is_private;
  const isPrivate =
    typeof isPrivateInput === "boolean"
      ? isPrivateInput
      : gameMode != null
        ? gameMode === -1
        : false;

  return {
    source,
    source_match_id: normalizeText(raw.sourceMatchId || raw.source_match_id || raw.matchId || raw.id),
    played_at: toIso(normalizeText(raw.playedAt || raw.played_at || raw.date)),
    region: normalizeText(raw.region),
    is_private: isPrivate,
    game_mode: gameMode,
    p1_leader_id: p1LeaderId,
    p2_leader_id: p2LeaderId,
    winner_side: winnerSide,
    turn_count: normalizeInt(raw.turnCount || raw.turn_count || raw.turnNumber || raw.turn_number),
    p1_device_hash: normalizeHash(raw.p1DeviceHash || raw.p1_device_hash || raw.playerDeviceId || raw.player_device_id),
    p2_device_hash: normalizeHash(raw.p2DeviceHash || raw.p2_device_hash || raw.oppDeviceId || raw.opp_device_id),
    p1_name: normalizeText(raw.p1Name || raw.p1_name || raw.playerName),
    p2_name: normalizeText(raw.p2Name || raw.p2_name || raw.oppPlayerName || raw.opp_name),
    p1_decklist: normalizeText(raw.p1Decklist || raw.p1_decklist || raw.decklist),
    p2_decklist: normalizeText(raw.p2Decklist || raw.p2_decklist || raw.oppDecklist),
  };
}

export function buildPlayerIndexUpserts(events: MatchEventInsert[]): PlayerIndexUpsert[] {
  const latestByDevice = new Map<string, PlayerIndexUpsert>();

  const upsertCandidate = (deviceHash: string | null, payload: Omit<PlayerIndexUpsert, "device_hash">) => {
    if (!deviceHash) return;
    const existing = latestByDevice.get(deviceHash);
    const currentTs = payload.last_seen_at ? new Date(payload.last_seen_at).getTime() : 0;
    const existingTs = existing?.last_seen_at ? new Date(existing.last_seen_at).getTime() : 0;

    if (!existing || currentTs >= existingTs) {
      latestByDevice.set(deviceHash, {
        device_hash: deviceHash,
        latest_player_name: payload.latest_player_name,
        last_seen_at: payload.last_seen_at,
        last_leader_id: payload.last_leader_id,
        latest_opponent_leader_id: payload.latest_opponent_leader_id,
      });
    }
  };

  for (const event of events) {
    upsertCandidate(event.p1_device_hash, {
      latest_player_name: event.p1_name,
      last_seen_at: event.played_at,
      last_leader_id: event.p1_leader_id,
      latest_opponent_leader_id: event.p2_leader_id,
    });

    upsertCandidate(event.p2_device_hash, {
      latest_player_name: event.p2_name,
      last_seen_at: event.played_at,
      last_leader_id: event.p2_leader_id,
      latest_opponent_leader_id: event.p1_leader_id,
    });
  }

  return [...latestByDevice.values()];
}

export function mapMatchForDevice(row: MatchEventRow, deviceHash: string): MatchHistoryRow {
  const isP1 = row.p1_device_hash === deviceHash;

  const playerLeader = isP1 ? row.p1_leader_id : row.p2_leader_id;
  const oppLeader = isP1 ? row.p2_leader_id : row.p1_leader_id;
  const playerName = isP1 ? row.p1_name : row.p2_name;
  const oppPlayerName = isP1 ? row.p2_name : row.p1_name;
  const decklist = isP1 ? row.p1_decklist : row.p2_decklist;
  const oppDecklist = isP1 ? row.p2_decklist : row.p1_decklist;

  let result: MatchResultLabel = "Unknown";
  if (row.winner_side === 1 || row.winner_side === 2) {
    result = row.winner_side === (isP1 ? 1 : 2) ? "Won" : "Lost";
  }

  return {
    id: row.id,
    date: row.played_at,
    result,
    playerLeader,
    oppLeader,
    playerName,
    oppPlayerName,
    turnNumber: row.turn_count,
    turnOrder: null,
    gameMode: row.game_mode,
    isPrivate: row.is_private,
    decklist,
    oppDecklist,
  };
}

export function computePlayerStats(deviceId: string, matches: MatchHistoryRow[]): PlayerStatsSummary {
  let wins = 0;
  let losses = 0;
  let draws = 0;

  let turnsTotal = 0;
  let turnsCount = 0;

  const leaderMap = new Map<
    string,
    {
      matches: number;
      wins: number;
      losses: number;
      draws: number;
    }
  >();

  for (const row of matches) {
    if (row.result === "Won") wins += 1;
    if (row.result === "Lost") losses += 1;
    if (row.result === "Draw") draws += 1;

    if (typeof row.turnNumber === "number" && Number.isFinite(row.turnNumber) && row.turnNumber > 0) {
      turnsTotal += row.turnNumber;
      turnsCount += 1;
    }

    const stat = leaderMap.get(row.playerLeader) || { matches: 0, wins: 0, losses: 0, draws: 0 };
    stat.matches += 1;
    if (row.result === "Won") stat.wins += 1;
    if (row.result === "Lost") stat.losses += 1;
    if (row.result === "Draw") stat.draws += 1;
    leaderMap.set(row.playerLeader, stat);
  }

  const matchesCount = matches.length;
  const winRate = matchesCount > 0 ? Number(((wins / matchesCount) * 100).toFixed(2)) : 0;

  const leaders = [...leaderMap.entries()]
    .map(([leaderId, stat]) => ({
      leaderId,
      matches: stat.matches,
      wins: stat.wins,
      losses: stat.losses,
      draws: stat.draws,
      winRate: stat.matches > 0 ? Number(((stat.wins / stat.matches) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 8);

  return {
    deviceId,
    wins,
    losses,
    draws,
    matches: matchesCount,
    winRate,
    averageTurns: turnsCount ? Number((turnsTotal / turnsCount).toFixed(2)) : null,
    leaders,
  };
}
