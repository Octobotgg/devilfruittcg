# DevilFruitTCG.gg

All-in-one One Piece Trading Card Game platform. Free. Built for players.

**Live at:** devilfruittcg.gg

## What's Inside

- **Market Watch** — eBay last 5 sold + TCGPlayer prices per card
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

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Styling:** Tailwind CSS
- **Cache:** better-sqlite3 (SQLite, local dev) → PostgreSQL (prod)
- **APIs:** eBay Browse API + TCGPlayer

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
| `EBAY_APP_ID` | eBay API client ID | developer.ebay.com |
| `EBAY_CERT_ID` | eBay API cert ID | developer.ebay.com |
| `TCGPLAYER_API_KEY` | TCGPlayer API key | developer.tcgplayer.com |

> **Note:** App works without API keys — it uses mock/seed data as fallback. Add real keys to get live prices.

## Deployment

### Frontend → Vercel
```bash
vercel deploy
```
Add env vars in Vercel dashboard.

> Build pipeline includes `prebuild` validation (`npm run validate:cards`). Deploys fail if card IDs, set/number alignment, or duplicate card IDs/numbers are incorrect.

### Database → Railway (prod)
SQLite works for local dev. For production, swap `lib/db.ts` to use a Railway PostgreSQL connection string via `DATABASE_URL`.

## Roadmap

- [x] Phase 1: Market Watch + card search
- [ ] Phase 2: Matchup Matrix (OPTCG Sim log integration)
- [ ] Phase 3: Collection Tracker + price alerts
- [ ] Phase 4: Local drop alerts (Fayetteville NC) + trade board

## Built By

Javier Barro + Octo 🐙
