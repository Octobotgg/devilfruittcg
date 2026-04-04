# DevilFruitTCG.gg

DevilFruitTCG is an all-in-one One Piece TCG platform for market prices, deck building, collection tracking, matchup intel, and community tools.

Live product:
- [devilfruittcg.gg](https://devilfruittcg.gg)
- [devilfruittcg.vercel.app](https://devilfruittcg.vercel.app/)

## What This Repo Is

This repository contains the current production web app.

The product goal is simple:
- give One Piece TCG players and collectors one place to check prices
- build and publish decks
- track collections and portfolio value
- study matchup and meta data
- grow into a bigger platform with community and local-store features

## What Works Today

- **Market**: browse cards, check market pages, movers, price history, and card detail pricing
- **Matchups**: matchup matrix, head-to-head views, and match-history surfaces
- **Meta**: current meta snapshot and deck-level drilldowns
- **Decks**: build decks, save them, and browse deck pages
- **Collection**: track cards, holdings, watchlist, transactions, and portfolio views
- **Accounts and profiles**: login, account pages, player profiles, and social/profile groundwork

## Start Here

If you are new, use this mental model:

- `main` is the real production branch
- this repo is the current production app
- `app/` contains pages and API routes
- `components/` contains UI building blocks
- `lib/` contains app logic, data helpers, and integrations
- `data/` contains card catalog files and related snapshots
- `scripts/` contains import, validation, and maintenance scripts
- `docs/` contains architecture and runbooks

## Local Setup

### Fastest setup

```bash
git clone <repo>
cd devilfruittcg
npm install
vercel env pull .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### If you do not want to use Vercel CLI

```bash
cp .env.local.example .env.local
```

Then fill in the variables you need manually.

## Helpful Commands

```bash
npm run dev
npm run build
npm run lint
npm run validate:cards
npm run validate:featured
npm run fetch:bandai
npm run audit:bandai
npm run backfill:match-intel
```

## Current Tech Stack

- **Frontend / app server**: Next.js 16 + React 19
- **Auth**: Supabase Auth
- **Current live data/storage mix**: Supabase, external feeds, and some legacy local SQLite-backed paths still present in production
- **Styling**: Tailwind CSS + custom CSS
- **Charts / UI**: Recharts, Framer Motion, Lucide

## Backend Direction

This repo is the current production app, but the backend is being cleaned up for long-term maintainability.

Agreed direction:
- keep the Next.js monolith
- keep Supabase Auth
- move durable data to Supabase/Postgres as the only durable database
- use Drizzle for schema and migrations
- treat JSON as import-only, not runtime truth
- make `card_prints` the core identity model
- move pricing to canonical external mapping tables
- keep route handlers as the backend-for-frontend layer

Read the plain-English architecture doc here:
- [docs/architecture.md](docs/architecture.md)

## Data And Operations

- Card catalog updates: [docs/card-catalog-update-runbook.md](docs/card-catalog-update-runbook.md)
- Match data sync: [docs/match-intel-sync.md](docs/match-intel-sync.md)
- Collection notes: [docs/collection-infra-notes.md](docs/collection-infra-notes.md)

## Deployment

- Production hosting: Vercel
- GitHub production branch: `main`
- Build validation runs through `prebuild`

## Workflow

Recommended workflow:

1. Branch off `main`
2. Make a focused change
3. Test locally
4. Open a PR
5. Merge back into `main`
6. Let Vercel deploy production from `main`

## Notes For Future Cleanup

- Some legacy card seed modules still exist in `lib/` even though the official Bandai catalog is the current source of truth
- Some current production flows still rely on older storage paths that are being redesigned
- The goal is to simplify this over time, not expand the mess

## Built By

Javier Barro
