# DevilFruit TCG — Project Brief

This is the shortest useful file to hand a new LLM before it starts work.

For deeper operating rules, also read:

- `LLM_CONTEXT.md`
- `docs/llm-development-workflow.md`

## What This Project Is

DevilFruit TCG is meant to become the **One Piece TCG home base**.

It is not supposed to feel like a bundle of tools or a generic dashboard. It should feel whole, intentional, and native to the world of One Piece TCG.

Its core pillars are:

- matchup matrix
- deck building
- market/pricing

The wider product can still include collection tracking, meta, account features, and future systems, but those three pillars are the current spine.

## Product Vision

An LLM should understand this before it changes anything:

- DevilFruit should feel like the One Piece TCG home base.
- It should feel self-contained and whole, not fragmented.
- It should feel like the people behind it understand One Piece.
- Accuracy and trust matter more than fake completeness.
- Strong One Piece atmosphere matters, but it should still feel premium and easy to trust.
- Every word should earn its place.

## Product Feel

The product should feel:

- sharp and competitive
- premium and collectible
- clean and trustworthy

It should not feel like:

- generic SaaS
- a dry wiki
- a loud hype brand
- filler-heavy product copy

## One Piece Soul

The clearest themes to preserve are:

- adventure / discovery
- inherited will
- freedom

Use One Piece flavor often, but with discipline. The goal is not cosplay or fanfic. The goal is to make the product feel like it belongs in that world.

## Current Architecture In One Paragraph

Card identity comes from the official Bandai English card catalog. Pricing comes from a staged pipeline: JustTCG provides candidate card and variant pricing data, TCGplayer is used as the audit/reference source, and the live website reads only published verified price/display rows. If a card cannot be matched confidently, it should stay `Unpriced` instead of borrowing another card's price.

## Read These First

1. `README.md`
2. `LLM_CONTEXT.md`
3. `docs/llm-development-workflow.md`
4. `docs/one-piece-optcg-understanding.md`
5. `docs/backend-pricing-verifier-runbook.md` if the task touches pricing

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

- Do not design from comparison first.
- Do not frame DevilFruit as a clone of anything else.
- Verify the current working directory before editing.
- Stay inside the requested scope.
- Do not guess with card data.
- Do not guess with pricing.
- Understand the game, not just the data fields.
- Understand One Piece through its themes and values, not just references.
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
5. docs/one-piece-optcg-understanding.md

Use PROJECT_MAP.md only as a navigation aid, not as the main source of truth.

Current task:
[PASTE TASK HERE]

Before editing, summarize:
- what the task is
- what files you expect to inspect
- what is out of scope
```
