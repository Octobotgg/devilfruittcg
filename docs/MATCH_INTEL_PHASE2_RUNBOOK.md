# Match Intel Phase 2 Runbook

## What shipped

- Aggregation pipeline script:
  - `scripts/aggregate-match-intel.mjs`
- New API:
  - `GET /api/rankings`
- Existing APIs upgraded to read V2 snapshots when enabled:
  - `GET /api/meta`
  - `GET /api/matchups`
  - `GET /api/matchups/headtohead`

## Required environment

- `MATCH_INTEL_V2=1`
- `SUPABASE_URL=<project-url>`
- `SUPABASE_SERVICE_ROLE_KEY=<service-role-key>`
- Optional for ingest endpoint auth:
  - `MATCH_INTEL_INGEST_KEY=<secret>`
- Optional bridge snapshot source URL:
  - `MATCH_INTEL_SNAPSHOT_BASE_URL=<https://.../stats>`
- Optional snapshot output override:
  - `MATCH_INTEL_SNAPSHOT_DIR=<absolute-or-relative-path>`

## Apply schema first

Run the Phase 0 SQL migration:

- `supabase/migrations/20260305_match_intel_phase0.sql`

## Run aggregation

### Native aggregation from `match_events` (recommended long-term)

#### Single period (default: west_p)

```bash
npm run aggregate:match-intel -- --period west_p --date 2026-03-05
```

#### All periods

```bash
npm run aggregate:match-intel -- --all --date 2026-03-05
```

### Bridge import from external snapshots (fast bootstrap)

#### Single period

```bash
npm run bridge:match-intel -- --period west_p --date 2026-03-05
```

#### All periods

```bash
npm run bridge:match-intel -- --all --date 2026-03-05
```

### Dry run (no DB upsert)

```bash
npm run aggregate:match-intel -- --all --dry-run
```

### Also emit snapshots into public/stats

```bash
npm run aggregate:match-intel -- --all --public
```

## API checks

```bash
curl -s "https://devilfruittcg.gg/api/rankings?period=west_p&limit=20"
curl -s "https://devilfruittcg.gg/api/matchups?period=west_p&limit=12"
curl -s "https://devilfruittcg.gg/api/meta?period=west_p"
curl -s "https://devilfruittcg.gg/api/matchhistory/summary"
```

If no snapshot rows exist yet, APIs fallback gracefully to existing aggregate/seeded modes.
