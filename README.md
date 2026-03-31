# DevilFruitTCG.gg

All-in-one One Piece Trading Card Game platform. Free. Built for players.

**Live at:** devilfruittcg.gg

## What's Inside

- **Market** — One Piece card catalog with published verified JustTCG pricing
- **Matchup Matrix** — Win rates by deck (OPTCG Sim data, coming soon)
- **Meta Snapshot** — Top decks from recent tournaments
- **Collection Tracker** — Track your cards + live value (coming soon)

## Data Accuracy Guarantees

`npm run validate:cards` enforces:
- Required card identity fields: `id`, `number`, `name`, `set`, `setCode`, `type`, `color`, `rarity`
- ID format correctness (ex: `OP01-001`)
- Hard match between `id` ↔ `setCode` and `id` ↔ `number`
- Duplicate detection for both card IDs and set+number combos
- Conditional gameplay-field checks (`cost` required for Leader/Character/Event/Stage; Leader requires power)
- Provisional-source handling: OP11+ records with incomplete gameplay stats are flagged as warnings (not hard-failed) until official/public source parity is complete; a tiny explicit allowlist covers known upstream gaps in legacy sets pending correction
- Image availability rule: explicit image URL or deterministic API fallback (`/api/card-image?id=...`)

## Pricing Verification

JustTCG is the runtime pricing source for candidate imports. TCGplayer is the audit and reference source used to verify those candidates before they are published.

The website reads published verified prices and published verified labels, not raw refresh output. That keeps failed refreshes and mapping drift out of the live UI.

## Workflow

- LLM/GitHub workflow guide: [docs/llm-development-workflow.md](./docs/llm-development-workflow.md)

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS
- **Cache:** better-sqlite3 (SQLite, local dev) → PostgreSQL (prod)
- **Pricing Pipeline:** JustTCG candidate imports → TCGplayer verification → published pricing

## Local Development

```bash
# Clone and install
git clone <repo>
cd devilfruittcg
npm install

# Copy env vars
cp .env.local.example .env.local
# Fill in your API keys

# Validate card data integrity (recommended before commits)
npm run validate:cards

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Description | Where to get it |
|---|---|---|
| `JUSTTCG_API_KEY` | JustTCG API key for candidate imports and incremental refreshes | justtcg.com |
| `DATABASE_URL` | Primary Postgres connection string for Drizzle scripts and runtime pricing reads | Supabase / Postgres provider |
| `SUPABASE_DB_URL` | Optional fallback Postgres connection string alias | Supabase |
| `EBAY_APP_ID` | eBay API client ID | developer.ebay.com |
| `EBAY_CERT_ID` | eBay API cert ID | developer.ebay.com |

> **Note:** The pricing pipeline needs a real Postgres connection plus a `JUSTTCG_API_KEY` for live refreshes. TCGplayer is used as an audit source during verification rather than as the runtime pricing provider.

## Deployment

### Frontend → Vercel
```bash
vercel deploy
```
Add env vars in Vercel dashboard.

> Build pipeline includes `prebuild` validation (`npm run validate:cards`). Deploys fail if card IDs, set/number alignment, or duplicate card IDs/numbers are incorrect.

### Database → Postgres (prod)
SQLite works for local dev. For production, point the app and Drizzle scripts at a Postgres connection string via `DATABASE_URL` or `SUPABASE_DB_URL`.

## Roadmap

- [x] Phase 1: Market Watch + card search
- [ ] Phase 2: Matchup Matrix (OPTCG Sim log integration)
- [ ] Phase 3: Collection Tracker + price alerts
- [ ] Phase 4: Local drop alerts (Fayetteville NC) + trade board

## Built By

Javier Barro + Octo 🐙
