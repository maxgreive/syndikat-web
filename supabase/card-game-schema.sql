create extension if not exists pgcrypto;

create table if not exists public.card_game_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  language text not null default 'de' check (language in ('de', 'en')),
  current_hole integer not null default 1,
  skin_carryover integer not null default 1,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  host_player_id uuid,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.card_game_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.card_game_rooms(id) on delete cascade,
  display_name text not null,
  token_hash text not null,
  score integer not null default 0,
  skins integer not null default 0,
  hand jsonb not null default '[]'::jsonb,
  joined_at timestamptz not null default now()
);

create table if not exists public.card_game_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.card_game_rooms(id) on delete cascade,
  player_id uuid references public.card_game_players(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.card_game_snapshots (
  room_id uuid primary key references public.card_game_rooms(id) on delete cascade,
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.card_game_rooms enable row level security;
alter table public.card_game_players enable row level security;
alter table public.card_game_events enable row level security;
alter table public.card_game_snapshots enable row level security;

create policy "rooms are readable by code"
  on public.card_game_rooms for select
  using (true);

create policy "events are readable for joined rooms"
  on public.card_game_events for select
  using (true);

create policy "players public columns are readable"
  on public.card_game_players for select
  using (true);

-- Hand privacy should be enforced through RPCs/views in production, because anon
-- clients must not receive other players' hand JSON. Store only a hash of the
-- private token and expose the current player's hand through a token-checking RPC.
