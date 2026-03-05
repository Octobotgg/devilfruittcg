#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const PERIODS = ["west", "lw", "east", "east_lw", "west_p", "lw_p", "east_p", "east_lw_p"];

function argValue(flag, fallback = null) {
  const i = process.argv.indexOf(`--${flag}`);
  if (i === -1) return fallback;
  return process.argv[i + 1] ?? fallback;
}

function hasFlag(flag) {
  return process.argv.includes(`--${flag}`);
}

function formatYmd(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function parseDate(input) {
  if (!input) return new Date();
  const d = new Date(`${input}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${input}`);
  return d;
}

function toRate(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Number(n.toFixed(6));
}

async function fetchSnapshot(period, ymd) {
  const url = `https://cdn.cardkaizoku.com/stats/stats_${period}_${ymd}.json?v=3`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data)) return null;
  return data;
}

function mapRows(period, snapshotDate, raw) {
  const leaderRows = [];
  const matchupRows = [];

  for (const leader of raw) {
    const leaderId = String(leader?.leader || "").trim().toUpperCase();
    if (!leaderId) continue;

    leaderRows.push({
      snapshot_date: snapshotDate,
      period,
      leader_id: leaderId,
      leader_name: String(leader?.leaderName || leaderId),
      wins: Number(leader?.wins || 0),
      number_of_matches: Number(leader?.number_of_matches || 0),
      total_matches: Number(leader?.total_matches || 0),
      raw_win_rate: toRate(leader?.raw_win_rate),
      play_rate: toRate(leader?.play_rate),
      weighted_win_rate: toRate(leader?.weighted_win_rate),
      first_win_rate: toRate(leader?.first_win_rate),
      second_win_rate: toRate(leader?.second_win_rate),
    });

    const matchups = Array.isArray(leader?.matchups) ? leader.matchups : [];
    for (const m of matchups) {
      const opponentId = String(m?.opponent || "").trim().toUpperCase();
      if (!opponentId) continue;

      matchupRows.push({
        snapshot_date: snapshotDate,
        period,
        leader_id: leaderId,
        opponent_id: opponentId,
        wins: Number(m?.wins || 0),
        total_games: Number(m?.total_games || 0),
        matchup_win_rate: toRate(m?.matchup_win_rate),
        first_wins: Number(m?.first_wins || 0),
        first_games: Number(m?.first_games || 0),
        first_win_rate: toRate(m?.first_win_rate),
        second_wins: Number(m?.second_wins || 0),
        second_games: Number(m?.second_games || 0),
        second_win_rate: toRate(m?.second_win_rate),
      });
    }
  }

  return { leaderRows, matchupRows };
}

async function upsertChunks(client, table, rows, onConflict, dryRun = false) {
  if (!rows.length) return 0;
  if (dryRun) return rows.length;

  const size = table === "leader_matchup_daily_stats" ? 1000 : 500;
  let count = 0;

  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size);
    const { error } = await client.from(table).upsert(chunk, { onConflict });
    if (error) throw error;
    count += chunk.length;
  }

  return count;
}

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY");
  }

  const all = hasFlag("all") || argValue("period", "west_p") === "all";
  const periods = all ? PERIODS : [argValue("period", "west_p")];
  for (const p of periods) {
    if (!PERIODS.includes(p)) {
      throw new Error(`Invalid period: ${p}`);
    }
  }

  const dryRun = hasFlag("dry-run");
  const publicOut = hasFlag("public");
  const outDir = argValue("out", path.join(process.cwd(), ".cache", "match-intel", "bridge"));

  const dateObj = parseDate(argValue("date", null));
  const ymd = formatYmd(dateObj);
  const fallbackDate = new Date(dateObj.getTime() - 24 * 60 * 60 * 1000);
  const fallbackYmd = formatYmd(fallbackDate);

  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  await fs.mkdir(outDir, { recursive: true });
  if (publicOut) {
    await fs.mkdir(path.join(process.cwd(), "public", "stats"), { recursive: true });
  }

  for (const period of periods) {
    let raw = await fetchSnapshot(period, ymd);
    let usedYmd = ymd;

    if (!raw) {
      raw = await fetchSnapshot(period, fallbackYmd);
      usedYmd = fallbackYmd;
    }

    if (!raw) {
      console.log(`[${period}] snapshot not found for ${ymd} or ${fallbackYmd}`);
      continue;
    }

    const snapshotDate = `${usedYmd.slice(0, 4)}-${usedYmd.slice(4, 6)}-${usedYmd.slice(6, 8)}`;
    const { leaderRows, matchupRows } = mapRows(period, snapshotDate, raw);

    const leaders = await upsertChunks(
      client,
      "leader_daily_stats",
      leaderRows,
      "snapshot_date,period,leader_id",
      dryRun
    );

    const matchups = await upsertChunks(
      client,
      "leader_matchup_daily_stats",
      matchupRows,
      "snapshot_date,period,leader_id,opponent_id",
      dryRun
    );

    const fileName = `stats_${period}_${usedYmd}.json`;
    const outPath = path.join(outDir, fileName);
    await fs.writeFile(outPath, JSON.stringify(raw, null, 2), "utf8");

    if (publicOut) {
      const publicPath = path.join(process.cwd(), "public", "stats", fileName);
      await fs.writeFile(publicPath, JSON.stringify(raw, null, 2), "utf8");
    }

    console.log(
      `[${period}] snapshotDate=${snapshotDate} leaders=${leaderRows.length} pairings=${matchupRows.length} upserted(leaders=${leaders},matchups=${matchups}) file=${outPath}${
        dryRun ? " [dry-run]" : ""
      }`
    );
  }
}

main().catch((error) => {
  console.error("[bridge-match-intel] failed:", error?.message || error);
  process.exit(1);
});
