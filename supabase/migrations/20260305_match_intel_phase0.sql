-- Phase 0 foundation for DevilFruitTCG match intelligence.
-- Creates canonical event + aggregate tables for match history, rankings, and matchup matrix.

create extension if not exists pgcrypto;

create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_match_id text,
  played_at timestamptz not null,
  region text,
  is_private boolean not null default false,
  game_mode int,

  p1_leader_id text not null,
  p2_leader_id text not null,
  winner_side smallint check (winner_side in (1, 2)),
  turn_count smallint,

  p1_device_hash text,
  p2_device_hash text,
  p1_name text,
  p2_name text,

  p1_decklist text,
  p2_decklist text,

  created_at timestamptz not null default now()
);

create unique index if not exists ux_match_events_source_match
  on public.match_events (source, source_match_id)
  where source_match_id is not null;

create index if not exists idx_match_events_played_at on public.match_events (played_at desc);
create index if not exists idx_match_events_p1_leader on public.match_events (p1_leader_id);
create index if not exists idx_match_events_p2_leader on public.match_events (p2_leader_id);
create index if not exists idx_match_events_region on public.match_events (region);

create table if not exists public.leader_daily_stats (
  snapshot_date date not null,
  period text not null,
  leader_id text not null,
  leader_name text not null,

  wins int not null default 0,
  number_of_matches int not null default 0,
  total_matches int not null default 0,

  raw_win_rate numeric(8, 6),
  play_rate numeric(8, 6),
  weighted_win_rate numeric(8, 6),
  first_win_rate numeric(8, 6),
  second_win_rate numeric(8, 6),

  created_at timestamptz not null default now(),

  constraint pk_leader_daily_stats primary key (snapshot_date, period, leader_id)
);

create index if not exists idx_leader_daily_stats_period_date
  on public.leader_daily_stats (period, snapshot_date desc);

create table if not exists public.leader_matchup_daily_stats (
  snapshot_date date not null,
  period text not null,
  leader_id text not null,
  opponent_id text not null,

  wins int not null default 0,
  total_games int not null default 0,
  matchup_win_rate numeric(8, 6),

  first_wins int not null default 0,
  first_games int not null default 0,
  first_win_rate numeric(8, 6),

  second_wins int not null default 0,
  second_games int not null default 0,
  second_win_rate numeric(8, 6),

  created_at timestamptz not null default now(),

  constraint pk_leader_matchup_daily_stats
    primary key (snapshot_date, period, leader_id, opponent_id)
);

create index if not exists idx_leader_matchup_daily_stats_period_date
  on public.leader_matchup_daily_stats (period, snapshot_date desc);

create index if not exists idx_leader_matchup_daily_stats_leader
  on public.leader_matchup_daily_stats (leader_id);

create table if not exists public.player_index (
  device_hash text primary key,
  latest_player_name text,
  last_seen_at timestamptz,
  last_leader_id text,
  latest_opponent_leader_id text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_player_index_last_seen_at
  on public.player_index (last_seen_at desc);

create index if not exists idx_player_index_latest_player_name
  on public.player_index (latest_player_name);
