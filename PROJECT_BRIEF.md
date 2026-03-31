# DevilFruit TCG — Project Brief

This is the shortest useful file to hand a new LLM before it starts work.

For deeper operating rules, also read:

- `LLM_CONTEXT.md`
- `docs/llm-development-workflow.md`

## What This Project Is

DevilFruit TCG is a One Piece TCG site with:

- card browsing and card detail
- market search and pricing
- collection tracking
- deck building and valuation
- meta/matchup data
- account/auth support

## Current Architecture In One Paragraph

Card identity comes from the official Bandai English card catalog. Pricing comes from a staged pipeline: JustTCG provides candidate card and variant pricing data, TCGplayer is used as the audit/reference source, and the live website reads only published verified price/display rows. If a card cannot be matched confidently, it should stay `Unpriced` instead of borrowing another card's price.

## Read These First

1. `README.md`
2. `LLM_CONTEXT.md`
3. `docs/llm-development-workflow.md`
4. `docs/backend-pricing-verifier-runbook.md` if the task touches pricing

## Main Runtime Truths

### Card identity

- `data/bandai-en-official-cards.json`
- `lib/official-cards.ts`
- `lib/cards.ts`
- `lib/card-variants.ts`

### Pricing

- `db/schema.ts`
- `lib/server/pricing/*`
- `scripts/import-bandai-official-to-drizzle.mjs`
- `scripts/import-justtcg-to-drizzle.mjs`
- `scripts/run-pricing-verification.mjs`
- `scripts/publish-verified-prices.mjs`

### Market UI

- `app/market/page.tsx`
- `app/cards/[id]/page.tsx`
- `components/market/*`
- `lib/server/market/*`

## Important Rules

- Verify the current working directory before editing.
- Stay inside the requested scope.
- Do not guess with card data.
- Do not guess with pricing.
- Keep scratch files out of git.
- Verify before claiming success.

## Good Default Prompt For A New LLM

```txt
You are working on DevilFruitTCG.

Read these first:
1. PROJECT_BRIEF.md
2. README.md
3. LLM_CONTEXT.md
4. docs/llm-development-workflow.md

Use PROJECT_MAP.md only as a navigation aid, not as the main source of truth.

Current task:
[PASTE TASK HERE]

Before editing, summarize:
- what the task is
- what files you expect to inspect
- what is out of scope
```
