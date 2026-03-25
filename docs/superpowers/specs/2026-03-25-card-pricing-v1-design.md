# DevilFruit Backend Design: Card + Pricing V1

## Status

Approved product direction for the first backend redesign slice.

Scope in this document:
- raw cards
- sealed products
- JustTCG commercial catalog and pricing
- marketplace, collection, and deck-cost runtime rules

Out of scope for this document:
- profile/social design details
- matchup/meta data model redesign
- subscription/billing
- trading/social marketplace workflows

## Why This Exists

The current backend mixes internal card identity, provider identity, and price lookup in ways that cause:
- wrong prices on the wrong print
- confusing image/title mismatches
- missing or guessed prices
- runtime dependence on ad hoc JSON and provider-specific assumptions

The redesign goal is to make pricing strict, understandable, and easy to maintain.

## Product Rules Already Agreed

- Next.js monolith stays
- Supabase Auth stays
- Supabase/Postgres becomes the only durable database
- Drizzle defines schema and migrations
- JSON is import-only, not runtime truth
- `card_prints` remains the core raw-card identity model
- JustTCG is the v1 commercial pricing source
- canonical runtime card price means `Near Mint USD`
- one approved active pricing source per collectible in v1
- no fallback across sibling prints or variants
- if no approved active JustTCG link exists, the collectible is `Unpriced`
- priced user-facing surfaces show JustTCG commercial identity first

## V1 Design Summary

Separate "what the collectible is" from "what market product/value represents it."

Internal identity:
- `card_prints` for raw cards
- `sealed_products` for sealed items

Commercial identity:
- `external_products` for imported JustTCG products

Strict bridge:
- review/history link tables store candidate mappings
- each runtime collectible stores one active approved JustTCG product pointer

Pricing:
- append-only provider snapshots at the external-product level
- current runtime price tables at the internal collectible level

UI effect:
- marketplace and collection feel like the user is looking at the priced commercial object
- gameplay, deck legality, rules text, and long-term data integrity still use internal identity

## Core Domain Model

### 1. Raw Card Identity

`cards`
- base game card identity
- rules text and gameplay characteristics

`card_prints`
- runtime raw-card identity
- one row per specific printable/versioned card object
- examples: base print, SP, manga, promo, reprint

Important rule:
- `card_print` is the identity boundary for raw cards
- pricing never bleeds across different `card_prints`

### 2. Sealed Identity

`sealed_products`
- internal identity for sealed items
- examples: booster boxes, starter decks, premium sets, packs, sealed collections

Important rule:
- sealed products are not card prints
- do not force sealed items into `card_prints`

### 3. Commercial Catalog

`external_sources`
- provider registry
- v1 active source: `justtcg`

`external_products`
- full imported JustTCG catalog
- one row per provider product
- stores provider title, image, URL, product metadata, raw payload, and product kind

Recommended `product_kind` values:
- `raw_card`
- `sealed`
- `graded`
- `other`

V1 UI usage:
- `graded` can exist in schema/imports but remains hidden in UI

## Mapping Model

### Raw Cards

`card_print_market_links`
- candidate and historical links from `card_print` to `external_product`
- stores:
  - `card_print_id`
  - `external_product_id`
  - `mapping_status`
  - `confidence`
  - `match_method`
  - `review_notes`
  - `approved_by`
  - `approved_at`

### Sealed

`sealed_product_market_links`
- candidate and historical links from `sealed_product` to `external_product`
- same review fields as raw cards

### Active Runtime Link

Runtime should not discover the active mapping by searching the review table on every request.

Instead:
- `card_prints.active_external_product_id`
- `sealed_products.active_external_product_id`

Rules:
- many candidate mappings may exist in history
- exactly zero or one active approved mapping is used at runtime
- active mapping must point to a JustTCG `external_product`
- if no active approved mapping exists, runtime treats the collectible as `Unpriced`

Why this is preferred:
- simpler reads
- deterministic behavior
- easier debugging
- lower risk of accidental wrong-price joins

## Pricing Model

### Provider History

`price_snapshots`
- append-only
- stored at the `external_product` level
- preserves what JustTCG reported over time

Fields should include:
- `external_product_id`
- `captured_at`
- `price_nm`
- `price_market` if available
- `price_lp` if available
- availability/inventory if useful
- raw payload

### Runtime Current Price: Raw Cards

`card_print_price_current`
- current resolved price table for raw cards
- one row per `card_print` per active source

Canonical meaning:
- DevilFruit runtime price for raw cards is `Near Mint USD`

Required fields:
- `card_print_id`
- `source_id`
- `external_product_id`
- `price_nm`
- `updated_at`
- optional derived deltas: `price_change_24h`, `price_change_7d`, `price_change_30d`

### Runtime Current Price: Sealed

`sealed_product_price_current`
- same role for sealed products

Required fields:
- `sealed_product_id`
- `source_id`
- `external_product_id`
- `price_market` or provider canonical sealed price
- `updated_at`
- optional derived deltas

### Runtime History: Raw Cards

`card_print_price_history`
- optional denormalized history for fast chart reads
- derived from snapshots plus active mappings

### Runtime History: Sealed

`sealed_product_price_history`
- optional denormalized history for sealed chart reads

## Runtime Rules

### Marketplace

Homepage:
- editorial market homepage, not plain catalog
- top gainers 24h
- top losers 24h
- cards and sealed separated by tabs/sections
- marketplace defaults to `Cards`

Search results:
- compact TCGplayer-style shopping grid
- shows:
  - JustTCG image
  - JustTCG product title
  - set code/name
  - current JustTCG price
- do not show generic `Parallel` labels
- use exact useful product naming
- detailed graph, sales, and listing data live on the detail page

Top movers trust rules:
- approved active JustTCG mapping required
- valid prior comparison snapshot required
- minimum price floor required
- suppress obvious bad data spikes

### Collection

Collection page behaves like a portfolio first.

Default structure:
- total collection value
- gain/loss summary
- time-range chart
- priced vs unpriced summary
- breakdown widgets
- most valuable items
- owned items below

Collection totals:
- sum only priced items
- explicitly show incomplete coverage
- example: total value plus priced-count and unpriced-count

Collection chart/performance v1:
- based on current owned quantities multiplied by historical price snapshots
- supported ranges:
  - `24H`
  - `7D`
  - `1M`
  - `3M`
  - `6M`
  - `ALL`

Collection item rendering:
- if active approved JustTCG mapping exists:
  - show JustTCG image/title/price first
  - show internal official metadata second
- if no active approved mapping exists:
  - still show the item
  - mark it `Unpriced`

### Decks

Deck construction identity:
- decks still store `card_print_id`

Deck valuation:
- deck cost is derived from linked active JustTCG product prices
- if a deck item has no active approved mapping, that card contributes no value and is marked `Unpriced`

Published deck pages:
- should show total deck cost from current linked prices

## User Data Impact

The current draft user tables support only raw cards.

Existing direction in schema:
- `collection_items`
- `holdings`
- `transactions`
- `watchlists`
- `deck_items`

For the broader redesign, this means:
- deck tables can stay raw-card only
- collection/holdings/watchlist/transactions need a sealed-aware design

Recommended future shape:
- separate raw-card item tables and sealed item tables
- avoid vague polymorphic foreign keys in v1 if possible

This is not implemented in this first pricing spec, but it should be planned before full collection migration.

## Import Pipeline

### Official Catalog Import

Bandai/official JSON remains import-only and feeds:
- `games`
- `releases`
- `cards`
- `card_prints`
- aliases and validation data

### JustTCG Import

JustTCG import feeds:
- `external_sources`
- `external_products`
- raw `price_snapshots`
- mapping candidates / review records
- resolved current price tables after approval logic

### Approval Flow

1. import full JustTCG catalog
2. generate candidate links
3. approve exact mappings
4. set active mapping pointer
5. materialize current runtime price row
6. expose priced UI

No approval:
- collectible remains visible but `Unpriced`

## Error Handling and Safety Rules

- never guess across sibling prints
- never auto-price an unmapped collectible
- never let a probable/review-needed mapping become runtime truth automatically
- preserve raw provider payloads for audit/debugging
- keep append-only pricing history
- audit approvals and active-link changes

## Why This Architecture Is Correct For DevilFruit

It matches the actual product.

DevilFruit is not only a catalog and not only a price board.
It needs:
- strong game identity for decks, rules, and long-term data integrity
- strong commercial identity for prices, images, and collection trust

This design keeps both without mixing them.

It is also maintainable for a solo founder because:
- reads are straightforward
- pricing logic is deterministic
- import jobs are auditable
- the schema can grow into more providers later without changing the UI contract now

## Explicit Non-Goals For V1

- multi-provider price blending
- pricing fallback across different prints
- graded UI support
- trying to make one table represent both raw cards and sealed items
- JSON as runtime catalog truth

## Recommended Next Spec Order

1. user data model
   - profiles
   - collections
   - holdings
   - transactions
   - watchlists
   - decks
   - sealed-aware ownership design

2. matchup/meta model
   - leader identity
   - deck publication
   - match event ingestion
   - aggregate matchup stats

## Concrete Schema Changes Against Current Scaffold

Keep:
- `cards`
- `card_prints`
- `external_sources`
- `external_products`
- `price_snapshots`
- import and review infrastructure

Change:
- split `card_print_external_map` into:
  - `card_print_market_links`
  - active pointer on `card_prints`

Add:
- `sealed_products`
- `sealed_product_market_links`
- `sealed_product_price_current`
- `sealed_product_price_history`
- `external_products.product_kind`

Adjust later:
- user-owned item tables to support both raw cards and sealed cleanly

## Acceptance Criteria For This Slice

This design is successful when:
- raw cards price only through approved active JustTCG links
- sealed products price through their own internal identity model
- marketplace renders JustTCG-facing priced cards cleanly
- collection totals and charts can be computed without guesswork
- deck cost can be derived from `card_print` links
- unmapped items safely show as `Unpriced`
