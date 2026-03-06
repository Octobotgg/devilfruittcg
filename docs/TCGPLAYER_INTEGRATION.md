# TCGplayer Integration (Phase 2C Bootstrap)

## Environment variables

Set in Vercel (or local env):

- `TCGPLAYER_PUBLIC_KEY`
- `TCGPLAYER_PRIVATE_KEY`

These correspond to your TCGplayer app public/private credentials.

---

## Auth flow used

- Endpoint: `POST https://api.tcgplayer.com/token`
- Headers:
  - `Authorization: Basic <base64(public:private)>`
  - `Content-Type: application/x-www-form-urlencoded`
- Body:
  - `grant_type=client_credentials`

Bearer token is cached in-memory and refreshed before expiry.

---

## Internal API routes added

### `GET /api/tcgplayer/status`
Checks credentials, fetches token, and returns:
- `configured`
- `categoriesReturned`
- detected `onePieceCategoryId`

Optional:
- `?refresh=1` forces token refresh.

### `GET /api/tcgplayer/search?q=<term>&limit=15`
Searches One Piece category/products and enriches with product price fields:
- `lowPrice`
- `midPrice`
- `highPrice`
- `marketPrice`
- `directLowPrice`
- `subTypeName`

Optional:
- `categoryId=<id>`

---

## Next (Phase 2C)

- Build persistent mapping table:
  - `canonicalVariantId -> tcgplayerProductId`
- Replace title-based pricing with mapped product IDs first.
- Keep variant-aware eBay as fallback only.
