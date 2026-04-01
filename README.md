# DevilFruitTCG.gg

All-in-one One Piece Trading Card Game platform built to bring pricing, decks, matchups, collections, and player tools into one place.

**Live at:** devilfruittcg.gg

## What's Live Today

- **Market** — One Piece card catalog with published verified JustTCG pricing
- **Matchups** — leader-vs-leader views and competitive insight surfaces
- **Meta** — current deck snapshot pages and tournament-driven meta views
- **Decks + Deck Builder** — saved decks, deck building, and valuation hooks
- **Collection + Profiles** — collection tracking, account tools, and public profile surfaces

Some of these areas are further along than others, but the repo already contains real app routes and backend logic for all of them.

## Start Here

If you are new to the repo, read these in order:

1. [PROJECT_BRIEF.md](./PROJECT_BRIEF.md)
2. [README.md](./README.md)
3. [LLM_CONTEXT.md](./LLM_CONTEXT.md)
4. [docs/one-piece-optcg-understanding.md](./docs/one-piece-optcg-understanding.md)
5. [docs/llm-development-workflow.md](./docs/llm-development-workflow.md)

If you are touching pricing, also read:

- [docs/backend-pricing-verifier-runbook.md](./docs/backend-pricing-verifier-runbook.md)

## Data Accuracy Guarantees

`npm run validate:cards` enforces:

- Required card identity fields: `id`, `number`, `name`, `set`, `setCode`, `type`, `color`, `rarity`
- ID format correctness, for example `OP01-001`
- Hard match between `id` and `setCode`, and between `id` and `number`
- Duplicate detection for both card IDs and set+number combos
- Conditional gameplay-field checks (`cost` required for Leader/Character/Event/Stage; Leader requires power)
- Provisional-source handling: OP11+ records with incomplete gameplay stats are warnings until official/public parity is complete
- Image availability rule: explicit image URL or deterministic API fallback (`/api/card-image?id=...`)

## Pricing Verification

JustTCG is the runtime pricing source for candidate imports. TCGplayer is the audit and reference source used to verify those candidates before they are published.

The website reads published verified prices and published verified labels, not raw refresh output. That keeps failed refreshes, stale imports, and mapping drift out of the live UI.

## Storage and Pricing Architecture

- **Card catalog validation** lives in-repo and runs during validation/build steps
- **SQLite-backed local stores** still exist for some local/runtime helpers and legacy scripts
- **Postgres is the source of truth** for Drizzle migrations, published pricing, pricing verification, and current pricing reads
- **Pricing flow** is `JustTCG candidate imports -> TCGplayer verification -> published pricing/display rows -> website reads`

If you are working on pricing or market data, assume Postgres is required unless you have verified otherwise for that exact task.

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS
- **Data stores:** SQLite in a few local/helper paths, Postgres for pricing and Drizzle-managed app data
- **Pricing pipeline:** JustTCG candidate imports, TCGplayer audit/verification, published read model

## Local Development

Copy the template first:

```bash
git clone <repo>
cd devilfruittcg
npm install
cp .env.local.example .env.local
```

Then choose the setup that matches your task.

### 1. Browse the app or work on general UI

```bash
npm run validate:cards
npm run dev
```

This is enough for basic UI work, but pages that depend on missing services will stay limited until you fill in the matching env vars below.

### 2. Work on auth, profiles, or cloud-backed user data

Set these in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_KEY`

If you are using Supabase as the cloud provider in the browser, also set:

- `NEXT_PUBLIC_CLOUD_PROVIDER=supabase`

### 3. Work on pricing, imports, or market data

Set these in `.env.local`:

- `DATABASE_URL` or `SUPABASE_DB_URL`
- `JUSTTCG_API_KEY`

Common commands:

```bash
npm run validate:cards
npm run import:bandai:db
npm run import:justtcg:db
npm run verify:pricing
npm run publish:pricing
npm run bootstrap:pricing
```

If you need marketplace comparison routes, also set:

- `EBAY_APP_ID`
- `EBAY_CERT_ID`

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

See [.env.local.example](./.env.local.example) for the working template.

Most common variables:

| Variable | Used for | Notes |
|---|---|---|
| `DATABASE_URL` | Postgres runtime and Drizzle scripts | Preferred primary Postgres connection string |
| `SUPABASE_DB_URL` | Postgres fallback alias | Used when `DATABASE_URL` is not set |
| `JUSTTCG_API_KEY` | Live JustTCG imports and refreshes | Required for candidate imports and incremental pricing sync |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser auth/client access | Needed for login and cloud-backed account surfaces |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser auth/client access | Paired with `NEXT_PUBLIC_SUPABASE_URL` |
| `SUPABASE_URL` | Server-side Supabase access | Used by profile and analytics sync paths |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase access | Preferred privileged server key |
| `SUPABASE_SERVICE_KEY` | Server-side Supabase access | Legacy fallback alias |
| `EBAY_APP_ID` | eBay lookups | Optional |
| `EBAY_CERT_ID` | eBay lookups | Optional |

## Deployment

### GitHub -> Vercel

Push changes to GitHub and let the connected Vercel project deploy from there.

- A branch push is not production by default.
- Production deploys come from the production branch configured in **Vercel Project Settings -> Git**.
- Branch pushes can create preview deploys if preview deployments are enabled.
- Manage environment variables in the Vercel dashboard.

> Build pipeline includes `prebuild` validation (`npm run validate:cards && npm run validate:featured`). Deploys fail if card IDs, set/number alignment, featured-card selections, or duplicate card IDs/numbers are incorrect.

### Database and scripts

- Production pricing and Drizzle scripts should point at Postgres through `DATABASE_URL` or `SUPABASE_DB_URL`.
- Do not assume a code deploy also refreshed pricing data. Pricing imports, verification, and publish steps are separate operational workflows.

## Roadmap

- [x] Market catalog and verified pricing foundation
- [ ] Matchup matrix and deeper competitive insight feeds
- [ ] Collection tracker polish and alerts
- [ ] Player, community, and trade-facing surfaces

## Built By

Javier Barro + Octo
