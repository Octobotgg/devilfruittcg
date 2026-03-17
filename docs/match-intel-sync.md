# Match Intel Sync

## Current pipeline

Competitive data currently has two distinct paths:

1. `app/api/matchups/route.ts`, `app/api/meta/route.ts`, and `app/api/matchups/headtohead/route.ts`
   - Prefer Supabase-backed snapshots when `MATCH_INTEL_V2=true`
   - Fall back to the external snapshot bridge at:
     - `https://cdn.cardkaizoku.com/stats/stats_<period>_<YYYYMMDD>.json?v=3`
   - Final fallback remains tournament aggregate / seeded data

2. `app/api/matchhistory/*`
   - Searchable raw match logs (`winner/loser/player/device`) come from `match_events`
   - Those rows are only populated through `app/api/matchhistory/ingest/route.ts`
   - There is still **no public raw OPTCGSim match-log endpoint wired into this repo**

## Live production setup

As of March 11, 2026:

- Production app: [https://devilfruittcg.gg](https://devilfruittcg.gg)
- Production deploy used for rollout: [https://devilfruittcg-go2na2p8w-javier-barros-projects.vercel.app](https://devilfruittcg-go2na2p8w-javier-barros-projects.vercel.app)
- Automatic snapshot sync runs through GitHub Actions, not Vercel cron
- The Vercel sync route still exists for protected manual refreshes, but the scheduled job writes directly from the Card Kaizoku CDN into Supabase REST
- Current schedule: every 2 hours via `.github/workflows/match-intel-sync.yml`

Why GitHub Actions is the live scheduler:

- Vercel's public endpoint is protected by the Security Checkpoint and returned `429` to unattended cron-style requests
- Direct GitHub Actions -> CDN -> Supabase sync avoids that checkpoint and is currently working in production

## Root cause of the data gap

As of the March 10, 2026 audit:

- There was **no live OPTCGSim scraper** in the repo
- `lib/sources/optcg-sim.ts` in git history was only a stub, never a real fetcher
- Production had the public Supabase URL/key and `MATCH_INTEL_SNAPSHOT_BASE_URL`, but **not**
  - `MATCH_INTEL_V2`
  - `MATCH_INTEL_INGEST_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- That meant:
  - the searchable raw-log ingest path was off
  - the Supabase snapshot tables were empty
  - matchup/meta pages were depending on direct bridge reads instead of a stored sync

## What this implementation adds

- `app/api/matchhistory/sync/route.ts`
  - Protected sync endpoint for manual and scheduled refreshes
  - Supports:
    - `mode=incremental`
    - `mode=backfill`
    - `days=<n>`
    - `endDate=<YYYY-MM-DD>`
    - `periods=west_p,east_p,...`
- `lib/analytics/snapshot-sync.ts`
  - Incremental snapshot ingestion with:
    - exact-date fetches
    - retry/backoff
    - per-period logging
    - idempotent upserts into `leader_daily_stats` and `leader_matchup_daily_stats`
- `.github/workflows/match-intel-sync.yml`
  - Runs every 2 hours
  - Also supports manual `workflow_dispatch`
  - Syncs snapshots directly into Supabase
- `scripts/backfill-match-intel.mjs`
  - Chunked historical backfill helper for large one-time imports

## Required configuration

Set these in Vercel production:

- `MATCH_INTEL_V2=true`
- `MATCH_INTEL_SNAPSHOT_BASE_URL=https://cdn.cardkaizoku.com/stats`
- `NEXT_PUBLIC_SUPABASE_URL=<project-url>`
- `CRON_SECRET=<random-long-secret>`

Optional server-side key for future tightening:

- `SUPABASE_SERVICE_ROLE_KEY=<service-role-key>`
  - Not currently required for the live rollout because the snapshot tables are writable through the existing anon-key policy
  - If Supabase policies are tightened later, set this and the sync route will use it automatically

Set this in GitHub Actions secrets:

- `DEVILFRUIT_CRON_SECRET=<same value as Vercel CRON_SECRET>`
- `DEVILFRUIT_SUPABASE_URL=<same value as NEXT_PUBLIC_SUPABASE_URL>`
- `DEVILFRUIT_SUPABASE_ANON_KEY=<same value as NEXT_PUBLIC_SUPABASE_ANON_KEY>`

## Scheduled sync

GitHub Actions runs the inline sync in:

- `.github/workflows/match-intel-sync.yml`

That job:

- runs every 2 hours at minute `17`
- checks the latest stored `snapshot_date` per period in `leader_daily_stats`
- fetches only newer CDN snapshots when they exist
- upserts into:
  - `leader_daily_stats`
  - `leader_matchup_daily_stats`

## Manual refresh

Manual GitHub-triggered refresh:

- GitHub Actions -> `Match Intel Sync` -> `Run workflow`

Protected API refresh still exists for one-off server-triggered syncs:

```bash
curl -X POST "https://devilfruittcg.gg/api/matchhistory/sync?mode=incremental" \
  -H "Authorization: Bearer $CRON_SECRET"
```

One-off historical chunk:

```bash
curl -X POST "https://devilfruittcg.gg/api/matchhistory/sync?mode=backfill&days=14&endDate=2026-03-10" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Large historical backfill in chunks:

```bash
MATCH_INTEL_SYNC_KEY=$CRON_SECRET npm run backfill:match-intel
```

Optional envs for the backfill helper:

- `MATCH_INTEL_SYNC_URL=https://devilfruittcg.gg`
- `MATCH_INTEL_BACKFILL_TOTAL_DAYS=180`
- `MATCH_INTEL_BACKFILL_CHUNK_DAYS=14`
- `MATCH_INTEL_BACKFILL_PERIODS=west_p,lw_p,east_p`

## Snapshot source coverage

The Card Kaizoku CDN source currently exposes aggregate daily snapshot files such as:

- `https://cdn.cardkaizoku.com/stats/stats_west_p_20260310.json?v=3`

During rollout, the discoverable snapshot coverage was:

- `west`, `lw`, `east`, `east_lw`, `west_p`, `lw_p`: March 3, 2026 through March 10, 2026
- `east_p`, `east_lw_p`: March 3, 2026 through March 9, 2026 initially, with March 10, 2026 available for `east_p` and `east_lw_p` by the live sync run

These files are aggregate leaderboard/matchup snapshots, not raw row-level game logs.

## First successful live backfill

GitHub Actions run:

- [https://github.com/Octobotgg/devilfruittcg/actions/runs/22931375732](https://github.com/Octobotgg/devilfruittcg/actions/runs/22931375732)

Result:

- `snapshotsUpserted=54`
- `leaderRowsUpserted=6553`
- `matchupRowsUpserted=475800`

## Remaining blocker

This implementation fully automates the **snapshot** side of matchup/meta data.

It does **not** invent a raw OPTCGSim game-log source. If you want searchable row-level match history
with winner/loser/player names to auto-populate, the repo still needs either:

- a real upstream OPTCGSim/OPBounty match-event endpoint, or
- a recurring export pushed into `app/api/matchhistory/ingest/route.ts`
