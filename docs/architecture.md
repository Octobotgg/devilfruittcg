# Architecture Status

Last updated: 2026-03-25

This document explains two things:

1. what is true in the production app today
2. where the backend is supposed to go next

It is written for humans, not just for tooling.

## Product Summary

DevilFruitTCG is an all-in-one One Piece TCG platform.

The product is trying to bring these jobs together in one place:
- market prices and card discovery
- collection and portfolio tracking
- deck building and deck publishing
- matchup and meta analysis
- profiles, sharing, and future community features

## What Is Live Today

Current production shape:
- Next.js monolith
- App Router pages plus route handlers
- Supabase Auth for account flows
- live data coming from a mix of official card exports, external feeds, Supabase-backed data, and some legacy local persistence patterns

Important reality:
- the app works
- the product surface is broader than the backend model
- the backend is not yet as clean as the long-term direction

## Current Mental Model

Think of the live app in three layers:

### 1. Frontend and page layer

- `app/` contains pages and route handlers
- route handlers are the backend-for-frontend layer for the UI

### 2. Product logic layer

- `lib/` contains card logic, pricing logic, auth/sync helpers, analytics helpers, and source adapters

### 3. Data layer

Today this is mixed:
- official card JSON exports
- Supabase-backed data
- external APIs / snapshots
- some legacy SQLite-backed app state still present in production code

## Why A Redesign Is Needed

The product is growing into something bigger than the current persistence model.

Main problems:
- more than one source of truth
- JSON files carrying runtime responsibility they should not carry forever
- card identity and price identity not cleanly separated
- some user/account data still living in weaker storage patterns
- docs describing old storage ideas that should not be the future

## Agreed Long-Term Direction

These are the current architecture decisions:

- keep the Next.js monolith
- keep Supabase Auth
- move to Supabase/Postgres as the only durable database
- use Drizzle for schema and migrations
- treat JSON as import-only, not runtime truth
- make `card_prints` the core identity model
- move pricing to canonical external mapping tables
- keep route handlers as the backend-for-frontend layer

## Data Direction By Domain

### Card and pricing architecture first

Target:
- `card_prints` becomes the canonical print identity
- provider products map into canonical prints
- pricing is attached through approved external mappings
- JSON becomes import/audit input, not runtime truth

### User data second

Target:
- profiles, decks, collection, holdings, watchlists, and transactions move to normalized relational storage
- auth metadata and local-only durable state stop being the long-term source of truth

### Matchups and meta third

Target:
- keep existing relational analytics working
- bring them under the same cleaner backend model over time

## Contribution Rules

Until the redesign lands, contributors should avoid making the backend mess worse.

Prefer:
- small changes
- explicit source boundaries
- route handlers that shape data for the UI without inventing new hidden persistence patterns

Avoid:
- adding new durable product state to local SQLite
- treating JSON snapshots as permanent runtime truth
- adding another storage path for the same domain concept

## Related Docs

- [README.md](../README.md)
- [card-catalog-update-runbook.md](./card-catalog-update-runbook.md)
- [match-intel-sync.md](./match-intel-sync.md)
- [collection-infra-notes.md](./collection-infra-notes.md)
