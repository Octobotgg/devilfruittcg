create table if not exists public.justtcg_card_map (
  devilfruit_id text primary key,
  bandai_number text not null,
  justtcg_id text not null,
  justtcg_tcgplayer_id text,
  justtcg_name text not null,
  justtcg_set text,
  search_method text not null,
  search_query text not null,
  candidate_count integer not null default 0,
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  confidence_reasons text[] not null default '{}',
  status text not null check (status in ('auto_approved', 'needs_review', 'manually_approved', 'rejected')),
  mapped_at timestamptz not null default now(),
  reviewed_at timestamptz,
  notes text
);

create index if not exists idx_justtcg_card_map_status on public.justtcg_card_map (status, mapped_at desc);
create index if not exists idx_justtcg_card_map_confidence on public.justtcg_card_map (confidence, mapped_at desc);
create index if not exists idx_justtcg_card_map_tcgplayer_id on public.justtcg_card_map (justtcg_tcgplayer_id);

create table if not exists public.justtcg_mapping_attempts (
  id bigint generated always as identity primary key,
  devilfruit_id text not null,
  bandai_number text not null,
  attempted_at timestamptz not null default now(),
  search_method text not null,
  search_query text not null,
  result_count integer not null default 0,
  best_candidate_id text,
  decision text not null check (decision in ('auto_approved', 'needs_review', 'rejected', 'error')),
  confidence text check (confidence in ('high', 'medium', 'low')),
  confidence_reasons text[] not null default '{}',
  raw_response jsonb,
  error_detail text
);

create index if not exists idx_justtcg_mapping_attempts_card_time
  on public.justtcg_mapping_attempts (devilfruit_id, attempted_at desc);
create index if not exists idx_justtcg_mapping_attempts_decision
  on public.justtcg_mapping_attempts (decision, attempted_at desc);

create table if not exists public.justtcg_sync_state (
  job_name text primary key,
  cursor_value text,
  updated_at timestamptz not null default now(),
  notes text
);

create table if not exists public.justtcg_catalog_snapshots (
  id bigint generated always as identity primary key,
  game text not null,
  fetched_at timestamptz not null default now(),
  page_count integer not null default 0,
  card_count integer not null default 0,
  notes text
);

create index if not exists idx_justtcg_catalog_snapshots_game_time
  on public.justtcg_catalog_snapshots (game, fetched_at desc);

create table if not exists public.justtcg_catalog_cards (
  snapshot_id bigint not null references public.justtcg_catalog_snapshots(id) on delete cascade,
  justtcg_id text not null,
  name text not null,
  number text,
  set_name text,
  tcgplayer_id text,
  raw_response jsonb not null default '{}'::jsonb,
  primary key (snapshot_id, justtcg_id)
);

create index if not exists idx_justtcg_catalog_cards_snapshot
  on public.justtcg_catalog_cards (snapshot_id);
create index if not exists idx_justtcg_catalog_cards_number
  on public.justtcg_catalog_cards (number);
create index if not exists idx_justtcg_catalog_cards_tcgplayer_id
  on public.justtcg_catalog_cards (tcgplayer_id);

create table if not exists public.justtcg_prices (
  devilfruit_id text primary key,
  justtcg_id text not null,
  price_nm numeric,
  price_lp numeric,
  price_change_24h numeric,
  price_change_7d numeric,
  price_change_30d numeric,
  last_updated_justtcg timestamptz,
  fetched_at timestamptz not null default now(),
  raw_response jsonb not null default '{}'::jsonb
);

create index if not exists idx_justtcg_prices_justtcg_id on public.justtcg_prices (justtcg_id);
create index if not exists idx_justtcg_prices_fetched_at on public.justtcg_prices (fetched_at desc);

create table if not exists public.justtcg_price_history (
  id bigint generated always as identity primary key,
  devilfruit_id text not null,
  price_nm numeric,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_justtcg_price_history_card_time
  on public.justtcg_price_history (devilfruit_id, recorded_at desc);

alter table public.justtcg_card_map enable row level security;
alter table public.justtcg_mapping_attempts enable row level security;
alter table public.justtcg_sync_state enable row level security;
alter table public.justtcg_catalog_snapshots enable row level security;
alter table public.justtcg_catalog_cards enable row level security;
alter table public.justtcg_prices enable row level security;
alter table public.justtcg_price_history enable row level security;
