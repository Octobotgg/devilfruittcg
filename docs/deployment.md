# Deployment Truth

This file is the shortest useful source of truth for how DevilFruit reaches production.

## Production

- live domain: `https://devilfruittcg.gg`
- default Vercel project name: `devilfruittcg`
- production branch: `main`

## Important Reality

GitHub Actions in this repo do **not** deploy the website.

The tracked workflows in `.github/workflows/` are data and sync jobs:

- `justtcg-refresh.yml`
- `match-intel-sync.yml`

Production is expected to update through the Vercel project linked to this repository.

## What To Expect

1. Push or merge changes into `main`
2. Vercel should build the current `main` commit
3. `devilfruittcg.gg` should update to that deployment

## Audit Rules

If production does not match GitHub:

1. confirm the change exists on `origin/main`
2. confirm the live domain is serving markup from the current commit
3. check whether the Vercel project linked to this repo is actually the one attached to `devilfruittcg.gg`
4. check whether Vercel is lagging, failed, or serving stale cached output

## Repository Notes

- local `.vercel/` files are ignored and are not the durable source of truth
- deployment expectations should be documented here, not left implicit in local machine state
