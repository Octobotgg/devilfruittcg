#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIODS = ["west", "lw", "east", "east_lw", "west_p", "lw_p", "east_p", "east_lw_p"];

function argValue(flag, fallback = null) {
  const i = process.argv.indexOf(`--${flag}`);
  if (i === -1) return fallback;
  return process.argv[i + 1] ?? fallback;
}

function hasFlag(flag) {
  return process.argv.includes(`--${flag}`);
}

function parseDate(input) {
  if (!input) return new Date();
  const d = new Date(`${input}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid --date value: ${input}`);
  return d;
}

function isEastRegion(region) {
  if (!region) return false;
  const r = String(region).toLowerCase();
  return ["east", "asia", "jp", "japan", "kr", "korea", "cn", "china", "tw", "taiwan", "hk", "hong kong", "apac"].some((k) => r.includes(k));
}

function normalizeRate(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return Number(n.toFixed(6));
}

function ensureLeader(map, leaderId) {
  let row = map.get(leaderId);
  if (!row) {
    row = {
      leader_id: leaderId,
      leader_name: leaderId,
      wins: 0,
      number_of_matches: 0,
      total_matches: 0,
      raw_win_rate: null,
      play_rate: null,
      weighted_win_rate: null,
      first_win_rate: null,
      second_win_rate: null,
    };
    map.set(leaderId, row);
  }
  return row;
}

function ensureMatchup(map, leaderId, opponentId) {
  let rowMap = map.get(leaderId);
  if (!rowMap) {
    rowMap = new Map();
    map.set(leaderId, rowMap);
  }

  let matchup = rowMap.get(opponentId);
  if (!matchup) {
    matchup = {
      leader_id: leaderId,
      opponent_id: opponentId,
      wins: 0,
      total_games: 0,
      matchup_win_rate: null,
      first_wins: 0,
      first_games: 0,
      first_win_rate: null,
      second_wins: 0,
      second_games: 0,
      second_win_rate: null,
    };
    rowMap.set(opponentId, matchup);
  }

  return matchup;
}

function periodToWindowDays(period) {
  return period.includes("lw") ? 7 : 30;
}

function eventInPeriod(event, period, snapshotMs) {
  const playedMs = Date.parse(String(event.played_at || ""));
  if (!Number.isFinite(playedMs)) return false;

  const windowDays = periodToWindowDays(period);
  const startMs = snapshotMs - windowDays * DAY_MS;
  const endMs = snapshotMs + DAY_MS - 1;

  if (playedMs < startMs || playedMs > endMs) return false;

  const privateOnly = period.endsWith("_p");
  if (privateOnly && !event.is_private) return false;

  const eastPeriod = period.includes("east");
  const eastEvent = isEastRegion(event.region);

  if (eastPeriod && !eastEvent) return false;
  if (!eastPeriod && eastEvent) return false;

  return true;
}

function aggregatePeriod(events, period, snapshotDate) {
  const leaderMap = new Map();
  const matchupMap = new Map();

  let totalMatches = 0;

  for (const event of events) {
    const p1 = String(event.p1_leader_id || "").trim();
    const p2 = String(event.p2_leader_id || "").trim();
    if (!p1 || !p2) continue;

    totalMatches += 1;

    const l1 = ensureLeader(leaderMap, p1);
    const l2 = ensureLeader(leaderMap, p2);

    l1.number_of_matches += 1;
    l2.number_of_matches += 1;

    const m12 = ensureMatchup(matchupMap, p1, p2);
    const m21 = ensureMatchup(matchupMap, p2, p1);

    m12.total_games += 1;
    m21.total_games += 1;

    const winner = Number(event.winner_side);
    if (winner === 1) {
      l1.wins += 1;
      m12.wins += 1;
    } else if (winner === 2) {
      l2.wins += 1;
      m21.wins += 1;
    }
  }

  if (!totalMatches) {
    return {
      leaderRows: [],
      matchupRows: [],
      snapshotJson: [],
      totalMatches: 0,
    };
  }

  const globalWr = 0.5;
  const alpha = 30;

  const leaderRows = [...leaderMap.values()].map((row) => {
    const raw = row.number_of_matches > 0 ? row.wins / row.number_of_matches : null;
    const play = totalMatches > 0 ? row.number_of_matches / totalMatches : null;

    const oppMap = matchupMap.get(row.leader_id) || new Map();
    let weighted = 0;

    for (const [oppId, matchup] of oppMap.entries()) {
      const opp = leaderMap.get(oppId);
      if (!opp) continue;
      const oppPlayRate = opp.number_of_matches / totalMatches;
      if (!oppPlayRate) continue;

      const smoothed = (matchup.wins + alpha * globalWr) / (matchup.total_games + alpha);
      weighted += smoothed * oppPlayRate;
    }

    return {
      snapshot_date: snapshotDate,
      period,
      leader_id: row.leader_id,
      leader_name: row.leader_name,
      wins: row.wins,
      number_of_matches: row.number_of_matches,
      total_matches: totalMatches,
      raw_win_rate: normalizeRate(raw),
      play_rate: normalizeRate(play),
      weighted_win_rate: normalizeRate(weighted || raw || globalWr),
      first_win_rate: null,
      second_win_rate: null,
    };
  });

  const matchupRows = [];
  for (const [leaderId, oppMap] of matchupMap.entries()) {
    for (const [oppId, row] of oppMap.entries()) {
      matchupRows.push({
        snapshot_date: snapshotDate,
        period,
        leader_id: leaderId,
        opponent_id: oppId,
        wins: row.wins,
        total_games: row.total_games,
        matchup_win_rate: normalizeRate(row.total_games > 0 ? row.wins / row.total_games : null),
        first_wins: 0,
        first_games: 0,
        first_win_rate: null,
        second_wins: 0,
        second_games: 0,
        second_win_rate: null,
      });
    }
  }

  leaderRows.sort((a, b) => (b.weighted_win_rate ?? 0) - (a.weighted_win_rate ?? 0));

  const matchupByLeader = new Map();
  for (const row of matchupRows) {
    const list = matchupByLeader.get(row.leader_id) || [];
    list.push(row);
    matchupByLeader.set(row.leader_id, list);
  }

  const snapshotJson = leaderRows.map((leader) => ({
    leader: leader.leader_id,
    leaderName: leader.leader_name,
    wins: leader.wins,
    number_of_matches: leader.number_of_matches,
    total_matches: leader.total_matches,
    raw_win_rate: leader.raw_win_rate,
    play_rate: leader.play_rate,
    weighted_win_rate: leader.weighted_win_rate,
    first_win_rate: leader.first_win_rate,
    second_win_rate: leader.second_win_rate,
    matchups: (matchupByLeader.get(leader.leader_id) || []).map((m) => ({
      opponent: m.opponent_id,
      wins: m.wins,
      total_games: m.total_games,
      matchup_win_rate: m.matchup_win_rate,
      first_wins: m.first_wins,
      first_games: m.first_games,
      first_win_rate: m.first_win_rate,
      second_wins: m.second_wins,
      second_games: m.second_games,
      second_win_rate: m.second_win_rate,
    })),
  }));

  return {
    leaderRows,
    matchupRows,
    snapshotJson,
    totalMatches,
  };
}

async function fetchEvents(client, startIso, endIso) {
  const rows = [];
  const pageSize = 1000;

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from("match_events")
      .select("played_at,region,is_private,p1_leader_id,p2_leader_id,winner_side")
      .gte("played_at", startIso)
      .lte("played_at", endIso)
      .order("played_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    const chunk = data || [];
    rows.push(...chunk);

    if (chunk.length < pageSize) break;
  }

  return rows;
}

async function upsertInChunks(client, table, rows, onConflict, dryRun = false) {
  if (!rows.length) return 0;
  if (dryRun) return rows.length;

  const chunkSize = table === "leader_matchup_daily_stats" ? 1000 : 500;
  let total = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await client.from(table).upsert(chunk, { onConflict });
    if (error) throw error;
    total += chunk.length;
  }

  return total;
}

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY");
  }

  const periodArg = argValue("period", "west_p");
  const runAll = hasFlag("all") || periodArg === "all";
  const snapshotDateObj = parseDate(argValue("date", new Date().toISOString().slice(0, 10)));
  const snapshotDate = snapshotDateObj.toISOString().slice(0, 10);
  const snapshotYmd = snapshotDate.replace(/-/g, "");
  const outDir = argValue(
    "out",
    process.env.MATCH_INTEL_SNAPSHOT_DIR || path.join(process.cwd(), ".cache", "match-intel", "snapshots")
  );
  const writePublic = hasFlag("public");
  const dryRun = hasFlag("dry-run");

  const periods = runAll ? PERIODS : [periodArg];
  for (const p of periods) {
    if (!PERIODS.includes(p)) {
      throw new Error(`Invalid period: ${p}. Expected one of: ${PERIODS.join(", ")}`);
    }
  }

  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const start30 = new Date(snapshotDateObj.getTime() - 30 * DAY_MS).toISOString();
  const endOfDay = new Date(snapshotDateObj.getTime() + DAY_MS - 1).toISOString();

  const sourceEvents = await fetchEvents(client, start30, endOfDay);
  const snapshotMs = snapshotDateObj.getTime();

  console.log(`[match-intel] source events in 30d window: ${sourceEvents.length}`);

  await fs.mkdir(outDir, { recursive: true });
  if (writePublic) {
    await fs.mkdir(path.join(process.cwd(), "public", "stats"), { recursive: true });
  }

  for (const period of periods) {
    const filtered = sourceEvents.filter((event) => eventInPeriod(event, period, snapshotMs));
    const result = aggregatePeriod(filtered, period, snapshotDate);

    if (!result.leaderRows.length) {
      console.log(`[${period}] no rows generated (filtered events: ${filtered.length})`);
      continue;
    }

    const leadersUpserted = await upsertInChunks(
      client,
      "leader_daily_stats",
      result.leaderRows,
      "snapshot_date,period,leader_id",
      dryRun
    );

    const matchupsUpserted = await upsertInChunks(
      client,
      "leader_matchup_daily_stats",
      result.matchupRows,
      "snapshot_date,period,leader_id,opponent_id",
      dryRun
    );

    const fileName = `stats_${period}_${snapshotYmd}.json`;
    const outPath = path.join(outDir, fileName);

    await fs.writeFile(outPath, JSON.stringify(result.snapshotJson, null, 2), "utf8");

    if (writePublic) {
      const publicPath = path.join(process.cwd(), "public", "stats", fileName);
      await fs.writeFile(publicPath, JSON.stringify(result.snapshotJson, null, 2), "utf8");
    }

    console.log(
      `[${period}] matches=${result.totalMatches} leaders=${result.leaderRows.length} pairings=${result.matchupRows.length} upserted(leaders=${leadersUpserted},matchups=${matchupsUpserted}) snapshot=${outPath}${
        dryRun ? " [dry-run]" : ""
      }`
    );
  }
}

main().catch((error) => {
  console.error("[match-intel] aggregation failed:", error?.message || error);
  process.exit(1);
});
