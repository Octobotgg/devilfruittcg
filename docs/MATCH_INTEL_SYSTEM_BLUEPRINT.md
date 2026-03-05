# DevilFruitTCG Match Intel System Blueprint

_Last updated: 2026-03-05_

## 1) Objective
Build first-party, durable analytics for:

- Match history
- Leader rankings
- Matchup matrix

without depending on fragile third-party scraping.

---

## 2) What we learned from public patterns (for architecture reference)
A common high-performing pattern is:

1. **Near-real-time match APIs** (search + per-player match log)
2. **Nightly aggregated leader stats snapshots** pushed to CDN JSON
3. Frontend computes trends by comparing latest snapshot vs prior snapshot

This is the architecture we should replicate (with our own data contracts).

---

## 3) Data source strategy (safe + sustainable)

### Primary (recommended)
- **Opt-in match telemetry ingestion** from community players/sim exports
- Ingest raw match events into normalized DB tables

### Secondary
- Tournament/decklist sources for meta context (event grounding)

### Fallback (temporary)
- Existing seeded/fallback data in app for continuity when ingestion is sparse

---

## 4) Storage architecture

## Choose persistence
- Use **Supabase Postgres** as source of truth (durable, queryable, works with Vercel)
- Keep local SQLite only for lightweight local cache (not canonical analytics store)

## Core tables

### `match_events`
Canonical normalized row per match.

- `id uuid pk`
- `source text` (sim_upload, tournament, manual)
- `source_match_id text`
- `played_at timestamptz`
- `region text`
- `is_private boolean`
- `game_mode int`
- `p1_leader_id text`
- `p2_leader_id text`
- `winner_side smallint` (1/2)
- `turn_count smallint`
- `p1_device_hash text`
- `p2_device_hash text`
- `p1_name text`
- `p2_name text`
- `p1_decklist text`
- `p2_decklist text`
- `created_at timestamptz default now()`

Unique constraints:
- `(source, source_match_id)`
- optional dedupe hash on `(played_at, p1_leader_id, p2_leader_id, p1_device_hash, p2_device_hash)`

### `leader_daily_stats`
Aggregated per leader per period.

- `snapshot_date date`
- `period text` (`west`, `east`, `west_p`, etc.)
- `leader_id text`
- `leader_name text`
- `wins int`
- `number_of_matches int`
- `total_matches int`
- `raw_win_rate numeric`
- `play_rate numeric`
- `weighted_win_rate numeric`
- `first_win_rate numeric`
- `second_win_rate numeric`

PK:
- `(snapshot_date, period, leader_id)`

### `leader_matchup_daily_stats`
Pairwise matrix values.

- `snapshot_date date`
- `period text`
- `leader_id text`
- `opponent_id text`
- `wins int`
- `total_games int`
- `matchup_win_rate numeric`
- `first_wins int`
- `first_games int`
- `first_win_rate numeric`
- `second_wins int`
- `second_games int`
- `second_win_rate numeric`

PK:
- `(snapshot_date, period, leader_id, opponent_id)`

### `player_index`
Fast match-history search support.

- `device_hash text pk`
- `latest_player_name text`
- `last_seen_at timestamptz`
- `last_leader_id text`
- `latest_opponent_leader_id text`

---

## 5) Aggregation formulas

## Base rates
- `raw_win_rate = wins / number_of_matches`
- `play_rate = number_of_matches / total_matches`

## Matchup weighted win rate (recommended)

For each leader `L`:

1. For each opponent `O`, compute smoothed matchup WR:
   - `smoothed_wr(L,O) = (wins_LO + alpha * global_wr) / (games_LO + alpha)`
2. Weight by opponent prevalence:
   - `weighted_win_rate(L) = Σ_O smoothed_wr(L,O) * play_rate(O)`

Suggested `alpha`: 25–50 for stability.

## First/Second rates
- `first_win_rate = first_wins / first_games`
- `second_win_rate = second_wins / second_games`

## Confidence guardrails
- Hide/de-emphasize matchup cells below minimum samples (e.g. <30 games)
- Store Wilson interval for tooltips/risk coloring if needed

---

## 6) API surface

## Match history
- `POST /api/matchhistory/search`
  - input: `searchTerm`
  - output: recent identity hits (name + device hash + last leaders + date)

- `GET /api/matchhistory/matches?deviceId=<hash>&page=1`
  - output: paginated match rows

- `GET /api/matchhistory/player-stats?deviceId=<hash>&startDate=...&endDate=...`
  - output: wins, matches, winrate, splits, top leaders

## Rankings + matrix
- `GET /api/rankings?period=west_p`
- `GET /api/matchups?period=west_p&top=12`
- `GET /api/meta/leader/:id?period=west_p`

## Snapshot endpoints (CDN friendly)
- `/stats/stats_<period>_<YYYYMMDD>.json`

Output should mirror fields already used in frontend (`leader`, `leaderName`, `wins`, `number_of_matches`, `matchups[]`, etc.).

---

## 7) Jobs, cadence, and caching

## Ingestion job
- Continuous or every 5–10 minutes
- Normalizes raw input into `match_events`

## Aggregation jobs
- **Nightly at 00:05 PT**: publish daily snapshot
- Optional **intra-day mini refresh** every 30 min for "live" freshness

## Caching strategy
- API responses: cache 30–120s (SWR)
- Snapshot JSON: immutable daily file + CDN edge cache
- Frontend trend: compare latest snapshot to previous snapshot

---

## 8) Data quality + abuse prevention

- Deduplicate by source ID + composite fingerprint
- Detect impossible records (negative turns, invalid leader IDs, duplicate timestamps spam)
- Maintain ingest audit logs (`ingest_errors`, `rejected_reason`)
- Hash/salt device identifiers before exposing publicly
- Never expose raw private identifiers in client responses

---

## 9) Rollout phases (implementation)

## Phase 0 — Foundation (1 day)
- Add Supabase schema + migration SQL
- Create typed data models and repo layer
- Add feature flag: `MATCH_INTEL_V2`

## Phase 1 — Match history MVP (1–2 days)
- Implement `/search` + `/matches` + `/player-stats`
- Build basic ingestion endpoint/job + dedupe
- Wire `/matchhistory` page to new API

## Phase 2 — Rankings + matrix engine (2 days)
- Aggregation pipeline for leaderboard + matchup stats
- Publish daily snapshots to storage/CDN path
- Add trend calculation (vs previous snapshot)

## Phase 3 — Frontend integration + parity (1–2 days)
- Matchups page reads v2 analytics contract
- Ranking page + filters (west/east/private)
- Confidence indicators and sample-size badges

## Phase 4 — Hardening (ongoing)
- Monitoring/alerts (ingest volume, stale snapshots, API p95)
- Backfill tools + replay pipeline
- Data QA dashboard

---

## 10) Immediate execution checklist

1. Create migration SQL for 4 core tables
2. Implement typed analytics repository (`lib/analytics/*`)
3. Add `/api/matchhistory/search` and `/api/matchhistory/matches`
4. Add nightly aggregation script (`scripts/aggregate-match-intel.ts`)
5. Emit first `stats_west_p_<date>.json` snapshot

---

## 11) Compatibility with current codebase

- Existing `lib/sources/optcg-sim.ts` is currently a stub → replace with real ingestion pipeline.
- Existing external tournament aggregate connectors can remain temporary fallback while v2 ramps.
- Existing `/api/meta` and `/api/matchups` can migrate progressively behind `MATCH_INTEL_V2`.
