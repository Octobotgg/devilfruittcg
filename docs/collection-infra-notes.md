# Collection Infrastructure Notes

Last updated: 2026-03-09

## Live today

- `/collection` now supports catalog browse filters, sorting, ownership quantities, condition labels, wishlist integration, set completion views, portfolio charts, cards-needed cross-reference, quick-add text import, CSV import/export, and local trade markers.
- Existing authenticated APIs already in use:
  - `/api/me/watchlist`
  - `/api/me/holdings`
  - `/api/me/portfolio`
  - `/api/me/movers`
  - `/api/market/history`
  - `/api/cards/prices`

## Still stubbed in the UI

- Public collection profiles at `/collection/[username]`
- Public trade binder URLs
- Collection comparison between users
- Shareable collection stats image

These features are blocked by missing public identity and visibility infrastructure, not by the collection page itself.

## Missing schema / platform pieces

### 1. Public profile identity

Needed fields or table:

- `public_username` on the user profile record, unique and indexed
- `collection_visibility` enum: `private`, `public`
- optional `trade_visibility` enum: `private`, `public`

### 2. Public collection publishing

Needed read model or API:

- public profile lookup by `public_username`
- public collection summary endpoint
- public holdings endpoint filtered by visibility rules
- Open Graph metadata for public collection pages

### 3. Trade binder publishing

Current trade markers are local-only in browser storage.

To make trade binders real, add persisted trade state:

- `user_trade_cards`
  - `id`
  - `user_id`
  - `card_id`
  - `quantity`
  - `condition_label`
  - `created_at`
  - `updated_at`

### 4. Collection comparison

Depends on public profiles plus a comparison endpoint:

- `GET /api/collection/compare?left=usernameA&right=usernameB`

Suggested response shape:

- `bothOwn`
- `leftOnly`
- `rightOnly`
- `tradableMatches`

### 5. Shareable stats image

Current page has the required data, but needs a dedicated renderer:

- client-side image export library or canvas template
- branded layout for avatar, value, top cards, and set completion
- share/download/copy actions

## Suggested implementation order

1. Add public username + privacy settings.
2. Persist trade binder data server-side.
3. Ship `/collection/[username]` public profile route.
4. Add public trade binder route under `/collection/[username]/trades`.
5. Add compare endpoint and UI.
6. Add stats image export.
