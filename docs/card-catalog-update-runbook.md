# Card Catalog Update Runbook

This project's English OPTCG catalog is currently updated by a script against the official Bandai English site. It is not fully automated yet.

## Current Source Of Truth

- Runtime catalog: `data/bandai-en-official-cards.json`
- Fetch script: `scripts/fetch-bandai-official-en.mjs`
- Validation: `npm run validate:cards`
- Optional audit: `npm run audit:bandai`

## Standard Update Flow

1. Pull the latest `main`.
2. Run `npm run fetch:bandai`.
3. Review the diff in `data/bandai-en-official-cards.json`.
4. Run `npm run validate:cards`.
5. Run `npm run audit:bandai` if a new product or release date looks incomplete.
6. Run `npm run build`.
7. Deploy once the catalog validates cleanly.

## 24-48 Hour Release Target

To keep new sets live within 24-48 hours of release:

- Run the fetch script the day Bandai publishes a new set, starter deck, or product update.
- Validate the JSON diff the same day.
- Ship the catalog update as its own small PR when possible.

## Known Bottlenecks

- The process is manual right now. Someone has to run the fetch script and review the diff.
- The fetcher depends on Bandai's current HTML structure. If their markup changes, the parser can fail until it is updated.
- Release metadata can still require a quick manual sanity check after fetch.

## Recommended Next Step

Add a scheduled CI job that runs `npm run fetch:bandai` daily, opens a PR when the catalog changes, and posts a validation summary. That removes the main operational delay without changing the runtime data model.
