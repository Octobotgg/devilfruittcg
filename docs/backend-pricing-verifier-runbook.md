# Backend Pricing Verifier Runbook

This runbook covers the staged JustTCG -> verify against TCGplayer -> publish flow.

## Full Refresh Flow

Use this when you want to rebuild the candidate layer and republish only verified rows.

1. Refresh JustTCG candidate data.
2. Run verification:

```bash
npm run verify:pricing
```

3. Inspect the report:

```bash
npm run report:pricing
```

4. Publish only the verified and drift-warning rows:

```bash
npm run publish:pricing
```

If verification shows new conflicts, stop before publish and inspect the conflicts section in the report.

## Bootstrap Cutover Flow

Use this when introducing published pricing for the first time or recovering a new environment.

1. Make sure the candidate tables are populated.
2. Run the bootstrap flow:

```bash
npm run bootstrap:pricing
```

3. Confirm the published price and published display tables now cover the live candidate set.
4. Run the report to verify that the latest run is healthy:

```bash
npm run report:pricing
```

Bootstrap is the safe cutover path because it seeds published rows without exposing the live UI to half-finished candidate refreshes.

## Incremental Refresh Flow

Use this for routine updates after the published layer is already in place.

1. Refresh the JustTCG candidate layer for the new set or card batch.
2. Run verification:

```bash
npm run verify:pricing
```

3. Inspect drift, mapping conflicts, and label mismatches:

```bash
npm run report:pricing -- --high-value-only
```

4. Publish only the approved rows:

```bash
npm run publish:pricing
```

5. Confirm the live surface still reads the published tables, not the candidate tables.

## Inspecting Verification Reports

`npm run report:pricing` prints JSON for the latest verification run.

Useful follow-ups:

```bash
npm run report:pricing | jq '.summary'
npm run report:pricing | jq '.topMismatchesByDollarDelta'
npm run report:pricing | jq '.topMismatchesByRatioDelta'
npm run report:pricing | jq '.buckets.driftWarnings'
```

Use `--premium-only` or `--high-value-only` to narrow the review set for fast manual review.
With npm scripts, forward flags with `--`, for example:

```bash
npm run report:pricing -- --premium-only
```

## Inspecting Conflicts

The report exposes:

- `buckets.mappingConflicts`
- `buckets.rowsWithMappingConflicts`
- `buckets.duplicateAssignments`
- `buckets.labelMismatches`
- `conflictBreakdownByReason`

To inspect one bucket in detail:

```bash
npm run report:pricing | jq '.buckets.rowsWithMappingConflicts'
```

For conflict evidence, inspect the conflict object fields in the bucket output. They include the expected and provider-side values that triggered the conflict.

## Recovering From a Failed Refresh

If a refresh fails after verification or during publish:

1. Do not clear the published tables.
2. Leave the last successful published rows in place.
3. Inspect the failed run in the report and the conflict buckets.
4. Re-run verification after the candidate data issue is fixed.
5. Publish again only after the new verification run is clean enough to ship.

The live site should continue reading the last successful published prices and labels until a new publish completes.
