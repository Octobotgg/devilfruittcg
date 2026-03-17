# DevilFruit TCG — Project Audit
*Generated March 8, 2026*

---

## PART 1: WHAT THIS PROJECT IS

### In Plain English

This is a **One Piece Trading Card Game (TCG) fan website** called DevilFruit TCG. It's a web app — not a simple website — meaning it has a server running behind it doing real work: fetching card prices, storing user collections, tracking tournament data, and so on.

Think of it like a small ESPN for the One Piece card game: you can browse cards and their prices, track which cards you own, build decks, look up tournament standings, and see how different deck types perform against each other.

---

### The Tech Stack (What It's Built With)

| Layer | Technology | What It Does |
|-------|-----------|--------------|
| **Framework** | Next.js 15 | The engine that runs the whole site — handles pages, navigation, and server logic |
| **Language** | TypeScript | A stricter version of JavaScript, catches bugs before they ship |
| **Styling** | Tailwind CSS v4 | Controls the look and feel — colors, fonts, spacing |
| **Database (local)** | SQLite (better-sqlite3) | A local database used during development for match history and market data |
| **Cloud Auth/Sync** | Supabase + Firebase | Two cloud services for user accounts and syncing collections (see note below) |
| **Animations** | Framer Motion | Smooth card flips, hover effects, page transitions |
| **Charts** | Recharts | Price history graphs, stat charts |
| **Deployment** | Vercel | The hosting platform — pushes the site live automatically from git |

> ⚠️ **Notable**: Both Firebase and Supabase are installed and active. Supabase handles full logins (email/password, password resets), while Firebase handles anonymous sessions. This looks like an in-progress migration from Firebase → Supabase, with both running side by side. This isn't broken, but it's worth knowing.

---

### The Pages (What Users See)

| URL | File | What It Does |
|-----|------|--------------|
| `/` | `app/page.tsx` | **Homepage** — hero section, featured cards, live market tickers |
| `/market` | `app/market/page.tsx` | **Card Market** — browse and search all cards with pricing |
| `/cards/[id]` | `app/cards/[id]/page.tsx` | **Card Detail** — individual card page with price history |
| `/collection` | `app/collection/page.tsx` | **My Collection** — track the cards you own |
| `/deckbuilder` | `app/deckbuilder/page.tsx` | **Deck Builder** — build and save decks |
| `/decks` | `app/decks/page.tsx` | **Saved Decks** — view your saved deck archive |
| `/meta` | `app/meta/page.tsx` | **Meta Snapshot** — top decks in the current competitive scene |
| `/matchups` | `app/matchups/page.tsx` | **Matchup Matrix** — deck vs. deck performance stats |
| `/matchhistory` | `app/matchhistory/page.tsx` | **Match History** — look up tournament records by player |
| `/account` | `app/account/page.tsx` | **Account** — sign in / account management |
| `/login` | `app/login/page.tsx` | **Login** — sign up or sign in page |
| `/logo-lab` | `app/logo-lab/page.tsx` | **Logo Lab** — ⚗️ Experimental page for testing logo designs |
| `/theme-lab` | `app/theme-lab/page.tsx` | **Theme Lab** — ⚗️ Experimental page for testing color themes |
| `/privacy` | `app/privacy/page.tsx` | Privacy policy |
| `/terms` | `app/terms/page.tsx` | Terms of service |

---

### The API Endpoints (Server Logic Behind the Scenes)

These are not pages — they're server functions the app calls internally to fetch or save data.

| Endpoint | What It Does |
|----------|-------------|
| `/api/cards` | Search cards from the official Bandai catalog |
| `/api/cards/variants` | Get variant/parallel card versions |
| `/api/cards/special-prints` | Get special print versions |
| `/api/card-image` | Serve card images |
| `/api/leaders` | Get leader cards |
| `/api/market` | Core market data endpoint |
| `/api/market/catalog` | Browse the market catalog |
| `/api/market/history` | Price history for a card |
| `/api/market/watch` | Watchlist market data |
| `/api/market-movers` | "Hot movers" — cards rising/falling in price |
| `/api/market-movers/refresh` | Force-refresh the movers data |
| `/api/me/holdings` | User's card holdings |
| `/api/me/portfolio` | User's portfolio value |
| `/api/me/transactions` | User's buy/sell history |
| `/api/me/watchlist` | User's watchlist |
| `/api/me/movers` | Personalized movers for the user |
| `/api/meta` | Meta deck data |
| `/api/meta/deck` | Individual meta deck details |
| `/api/matchups` | Matchup matrix data |
| `/api/matchups/headtohead` | Head-to-head deck comparison |
| `/api/matchhistory/ingest` | Import match results |
| `/api/matchhistory/matches` | Query match records |
| `/api/matchhistory/player-stats` | Player statistics |
| `/api/matchhistory/search` | Search match history |
| `/api/matchhistory/summary` | Match history summary |
| `/api/ebay/account-deletion` | eBay account deletion webhook |

---

### The Shared Components (Reusable Building Blocks)

| File | What It Does |
|------|-------------|
| `components/Navbar.tsx` | Top navigation bar — appears on every page |
| `components/BrandMark.tsx` | The "DEVILFRUIT TCG" logo lockup |
| `components/CardModal.tsx` | Pop-up card detail overlay |
| `components/auth/AuthNavButton.tsx` | Sign-in button in the navbar |
| `components/market/MarketCatalogView.tsx` | The main card browse/search UI |
| `components/market/CardDetailMarketPanel.tsx` | Pricing panel on card detail pages |
| `components/market/BackToMarketButton.tsx` | "← Back to Market" button |
| `components/ui/DashboardCard.tsx` | Reusable dashboard panel/card container |
| `components/ui/DonButton.tsx` | Branded call-to-action button |
| `components/ui/GlowTag.tsx` | Glowing badge/tag (e.g. card types) |
| `components/ui/LeaderColorTag.tsx` | Color badge for leader card identity |
| `components/ui/LiveStatusStrip.tsx` | Live data status bar |
| `components/ui/TickerRow.tsx` | Compact stat/ticker row |
| `components/ui/TiltCard.tsx` | 3D tilt/parallax card hover effect |

---

### The Card Data Flow (How Card Data Gets Into the Site)

```
Bandai Official Website
        ↓
scripts/fetch-bandai-official-en.mjs   ← Run manually with "npm run fetch:bandai"
        ↓
data/bandai-en-official-cards.json     ← The master card database (JSON file)
        ↓
lib/official-cards.ts                  ← TypeScript module that reads and exposes the JSON
        ↓
lib/card-feed.ts                       ← Pagination/filtering layer on top of official-cards
        ↓
app/api/cards/route.ts                 ← API endpoint that the UI calls
        ↓
UI Pages                               ← What users see
```

---

### The Library Files (`lib/`) — Active Ones

| File | What It Does |
|------|-------------|
| `lib/official-cards.ts` | ✅ THE card database — reads from the JSON and exposes search functions |
| `lib/card-feed.ts` | ✅ Pagination wrapper over official-cards |
| `lib/card-variants.ts` | ✅ Logic for parallels, manga prints, special prints |
| `lib/market-catalog.ts` | ✅ Market browse/filter query logic |
| `lib/market-navigation.ts` | ✅ URL state management for market page |
| `lib/market-types.ts` | ✅ Type definitions for market data |
| `lib/ebay.ts` | ✅ eBay integration for card pricing |
| `lib/gumgum-market-moves.ts` | ✅ Market movers data from GumGum |
| `lib/matchups.ts` | ✅ Matchup data helpers |
| `lib/meta-decks.ts` | ✅ Meta deck curation |
| `lib/deck-names.ts` | ✅ Deck name/label helpers |
| `lib/featured-cards.ts` | ✅ Curated featured cards for homepage |
| `lib/db.ts` | ✅ SQLite database access |
| `lib/abuse-protection.ts` | ✅ Rate limiting / request protection |
| `lib/user-context.ts` | ✅ Current user helpers |
| `lib/use-preferred-special-prints.ts` | ✅ Hook for preferred print preferences |
| `lib/cloud/*` | ✅ Auth and cloud sync (Firebase + Supabase) |
| `lib/analytics/*` | ✅ Match analytics repository and transforms |
| `lib/sources/external-snapshot-bridge.ts` | ✅ Active data bridge (used by meta/matchup APIs) |
| `lib/sources/limitless-matchups.ts` | ✅ Matchup data from Limitless source |
| `lib/config/flags.ts` | ✅ Feature flags |
| `lib/theme/*` | ✅ Leader color themes |
| `lib/motion/standards.ts` | ✅ Animation constants |
| `lib/data/meta.ts` | ✅ Meta page data |

---

---

## PART 2: PROBLEMS FOUND

### Category A — Legacy Per-Set Card Files (38 Files, All Safe to Delete)

When the project was young, each card set was stored as a separate hand-typed TypeScript file. This was replaced by a single official Bandai JSON export (`data/bandai-en-official-cards.json`) that contains everything. The old per-set files are **still sitting in `lib/`** but nothing imports them anymore — they're dead weight.

**Real current source:** `data/bandai-en-official-cards.json` + `lib/official-cards.ts`

**Safe to remove (38 files):**

*Main sets (OP series):*
- `lib/op01-cards.ts` through `lib/op14-cards.ts` — 14 files, Romance Dawn through [latest set]

*Starter decks (ST series):*
- `lib/st01-cards.ts` through `lib/st21-cards.ts` — 21 files

*Extra boosters (EB series):*
- `lib/eb01-cards.ts`, `lib/eb02-cards.ts` — 2 files

*Support file:*
- `lib/starter-decks.ts` — 1 file that referenced the ST files

**Why it's safe:** Grepped the entire codebase — zero imports found for any of these files.

---

### Category B — Replaced Source Files (2 Files)

| File | Problem | Real Current Version | Safe to Delete? |
|------|---------|---------------------|-----------------|
| `lib/cards.ts` | Original card types file, now superseded | `lib/official-cards.ts` | ✅ Yes |
| `scripts/fetch-card-data.mjs` | Old card-fetch script that pulled from a GitHub repo | `scripts/fetch-bandai-official-en.mjs` | ✅ Yes |

---

### Category C — Unused Components (2 Files)

| File | Problem | Real Current Version | Safe to Delete? |
|------|---------|---------------------|-----------------|
| `components/auth/CloudAuthButton.tsx` | Old auth button — never imported anywhere | `components/auth/AuthNavButton.tsx` | ✅ Yes |
| `components/ui/WantedPosterCard.tsx` | Designed but never used anywhere in the app | (no replacement — just unused) | ✅ Yes |

---

### Category D — Unused External Data Adapters (5 Files)

These files in `lib/sources/` were written to pull data from external sites but were never wired into any API routes.

| File | What It Was For | Safe to Delete? |
|------|----------------|-----------------|
| `lib/sources/gumgum.ts` | GumGum data scraper | ✅ Yes — zero imports |
| `lib/sources/gumgum-matchups.ts` | GumGum matchup data | ✅ Yes — zero imports |
| `lib/sources/limitless.ts` | Limitless TCG scraper | ✅ Yes — zero imports |
| `lib/sources/optcg-sim.ts` | OPTCG Simulator adapter | ✅ Yes — zero imports |
| `lib/sources/tournaments.ts` | Tournament data adapter | ✅ Yes — zero imports |

Note: `lib/sources/external-snapshot-bridge.ts` and `lib/sources/limitless-matchups.ts` are **active and used** — do not delete.

---

### Category E — Unused Public Assets (8 Files)

| File | Problem | Safe to Delete? |
|------|---------|-----------------|
| `public/file.svg` | Default Next.js starter template file | ✅ Yes |
| `public/globe.svg` | Default Next.js starter template file | ✅ Yes |
| `public/next.svg` | Default Next.js starter template file | ✅ Yes |
| `public/vercel.svg` | Default Next.js starter template file | ✅ Yes |
| `public/window.svg` | Default Next.js starter template file | ✅ Yes |
| `public/images/devilfruit-emblem.svg` | Older logo version — no references in code | ✅ Yes (or archive) |
| `public/images/logo-wordmark.svg` | Unused logo variant | ✅ Yes (or archive) |
| `public/images/straw-hat.png` | Unused image asset | ✅ Yes (or archive) |

---

### Category F — Legacy Scripts (2 Files)

| File | Problem | Safe to Delete? |
|------|---------|-----------------|
| `scripts/fetch-card-data.mjs` | Old GitHub-based card fetch script (replaced by official Bandai fetch) | ✅ Yes |
| `scripts/parse-cards.js` | Legacy card parser from early development | ✅ Yes |

---

### Category G — Noise/Junk (1 File)

| File | Problem | Safe to Delete? |
|------|---------|-----------------|
| `lib/.cards.ts.swp` | An editor crash/swap file accidentally committed to the repo | ✅ Yes |

---

### Category H — Audit Snapshot Data (Worth Discussing)

These files aren't breaking anything but they're taking up space and could be confusing:

| File | What It Is | Recommendation |
|------|-----------|---------------|
| `data/bandai-en-base-cards.json` | A derived subset of the main catalog — used only by audit scripts | Move to `reports/` or keep in `data/` |
| `data/current-site-cards-pre-fix.json` | A snapshot of card data taken before a bug fix | Move to `reports/` (it's an audit artifact) |
| `data/bandai-en-official-releases.json` | Release inventory used by audit scripts | Keep in `data/` — it's a useful reference |

---

### Summary Count

| Category | File Count | Action |
|----------|-----------|--------|
| Legacy per-set card files | 38 | Delete |
| Replaced source files | 2 | Delete |
| Unused components | 2 | Delete |
| Unused external adapters | 5 | Delete |
| Unused public assets | 8 | Delete |
| Legacy scripts | 2 | Delete |
| Junk/noise | 1 | Delete |
| Misplaced audit data | 2 | Move to `reports/` |
| **Total** | **60** | |

---

---

## PART 3 PREVIEW: PROPOSED CLEAN FOLDER STRUCTURE

*(Full execution pending your approval)*

### Before → After

```
BEFORE (lib/ folder — cluttered):          AFTER (lib/ folder — clean):
lib/                                        lib/
├── .cards.ts.swp          ← DELETE        ├── abuse-protection.ts
├── abuse-protection.ts                     ├── analytics/
├── analytics/                              ├── card-feed.ts
├── card-feed.ts                            ├── card-variants.ts
├── card-variants.ts                        ├── cards.ts             ← REMOVED
├── cards.ts               ← DELETE        ├── cloud/
├── cloud/                                  ├── config/
├── config/                                 ├── data/
├── data/                                   ├── db.ts
├── db.ts                                   ├── deck-names.ts
├── deck-names.ts                           ├── ebay.ts
├── eb01-cards.ts          ← DELETE        ├── featured-cards.ts
├── eb02-cards.ts          ← DELETE        ├── gumgum-market-moves.ts
├── ebay.ts                                 ├── market-catalog.ts
├── featured-cards.ts                       ├── market-navigation.ts
├── gumgum-market-moves.ts                  ├── market-types.ts
├── market-catalog.ts                       ├── matchups.ts
├── market-navigation.ts                    ├── meta-decks.ts
├── market-types.ts                         ├── motion/
├── matchups.ts                             ├── official-cards.ts
├── meta-decks.ts                           ├── sources/
├── motion/                                 │   ├── external-snapshot-bridge.ts
├── official-cards.ts                       │   └── limitless-matchups.ts
├── op01-cards.ts          ← DELETE        ├── starter-decks.ts     ← REMOVED
├── op02-cards.ts          ← DELETE        ├── theme/
├── ... (op03 - op14)      ← DELETE        ├── use-preferred-special-prints.ts
├── sources/                                └── user-context.ts
│   ├── external-snapshot-bridge.ts
│   ├── gumgum-matchups.ts ← DELETE
│   ├── gumgum.ts          ← DELETE
│   ├── limitless-matchups.ts
│   ├── limitless.ts       ← DELETE
│   ├── optcg-sim.ts       ← DELETE
│   └── tournaments.ts     ← DELETE
├── st01-cards.ts          ← DELETE
├── ... (st02 - st21)      ← DELETE
├── starter-decks.ts       ← DELETE
├── theme/
├── use-preferred-special-prints.ts
└── user-context.ts
```

```
BEFORE (public/):                          AFTER (public/):
public/                                    public/
├── file.svg               ← DELETE       ├── images/
├── globe.svg              ← DELETE       │   ├── grandline-map.svg
├── images/                               │   ├── logo-concept-coin.svg
│   ├── devilfruit-emblem.svg ← DELETE    │   ├── logo-concept-crest.svg
│   ├── grandline-map.svg                 │   └── logo-concept-esports.svg
│   ├── logo-concept-coin.svg             └── (favicon and icon are in app/)
│   ├── logo-concept-crest.svg
│   ├── logo-concept-esports.svg
│   ├── logo-wordmark.svg  ← DELETE
│   └── straw-hat.png      ← DELETE
├── next.svg               ← DELETE
├── vercel.svg             ← DELETE
└── window.svg             ← DELETE
```

```
BEFORE (data/):                            AFTER (data/):
data/                                      data/
├── bandai-en-base-cards.json              ├── bandai-en-official-cards.json
├── bandai-en-official-cards.json          ├── bandai-en-official-releases.json
├── bandai-en-official-releases.json       └── (bandai-en-base-cards moved to reports/)
└── current-site-cards-pre-fix.json
                                           reports/  (existing folder, add to it)
                                           ├── bandai-audit-post-fix.json
                                           ├── bandai-audit-post-fix.md
                                           ├── bandai-audit-pre-fix.json
                                           ├── bandai-audit-pre-fix.md
                                           ├── bandai-en-base-cards.json      ← MOVED
                                           └── current-site-cards-pre-fix.json ← MOVED
```

```
BEFORE (scripts/):                         AFTER (scripts/):
scripts/                                   scripts/
├── audit-bandai-en.mjs                   ├── audit-bandai-en.mjs
├── ensure-canonical.sh                   ├── ensure-canonical.sh
├── fetch-bandai-official-en.mjs          ├── fetch-bandai-official-en.mjs
├── fetch-card-data.mjs    ← DELETE       ├── smoke-market.cjs
├── parse-cards.js         ← DELETE       ├── validate-cards.cjs
├── smoke-market.cjs                      └── validate-featured-cards.cjs
├── validate-cards.cjs
└── validate-featured-cards.cjs
```

```
BEFORE (components/):                      AFTER (components/):
components/                                components/
├── auth/                                  ├── auth/
│   ├── AuthNavButton.tsx                  │   └── AuthNavButton.tsx
│   └── CloudAuthButton.tsx ← DELETE      ├── market/
├── market/                                │   ├── BackToMarketButton.tsx
│   ├── BackToMarketButton.tsx             │   ├── CardDetailMarketPanel.tsx
│   ├── CardDetailMarketPanel.tsx          │   └── MarketCatalogView.tsx
│   └── MarketCatalogView.tsx             ├── ui/
├── ui/                                    │   ├── DashboardCard.tsx
│   ├── DashboardCard.tsx                  │   ├── DonButton.tsx
│   ├── DonButton.tsx                      │   ├── GlowTag.tsx
│   ├── GlowTag.tsx                        │   ├── LeaderColorTag.tsx
│   ├── LeaderColorTag.tsx                 │   ├── LiveStatusStrip.tsx
│   ├── LiveStatusStrip.tsx                │   ├── TickerRow.tsx
│   ├── TickerRow.tsx                      │   └── TiltCard.tsx
│   ├── TiltCard.tsx                       ├── BrandMark.tsx
│   └── WantedPosterCard.tsx ← DELETE     ├── CardModal.tsx
├── BrandMark.tsx                          └── Navbar.tsx
├── CardModal.tsx
└── Navbar.tsx
```

---

## AWAITING YOUR APPROVAL

The above shows exactly what will be deleted and moved. No changes have been made yet.

**To proceed with cleanup, please confirm:**
1. ✅ Delete the 57 identified files listed above
2. ✅ Move the 2 audit data files to `reports/`

Or let me know if you'd like to keep anything that's currently marked for deletion.
