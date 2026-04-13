create table if not exists public.deck_notes (
  deck_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  constraint deck_notes_pkey primary key (deck_id, user_id),
  constraint deck_notes_notes_length check (char_length(notes) <= 2000)
);

create index if not exists idx_deck_notes_user_updated_at
  on public.deck_notes (user_id, updated_at desc);

alter table public.deck_notes enable row level security;

create policy "deck_notes_select_own"
  on public.deck_notes
  for select
  using (auth.uid() = user_id);

create policy "deck_notes_insert_own"
  on public.deck_notes
  for insert
  with check (auth.uid() = user_id);

create policy "deck_notes_update_own"
  on public.deck_notes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "deck_notes_delete_own"
  on public.deck_notes
  for delete
  using (auth.uid() = user_id);
