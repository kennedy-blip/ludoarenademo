-- Ludo Arena KE — engagement + money ledger schema
-- Run with: supabase db push   (or paste into the SQL editor)
-- Safe to re-run: every object uses IF NOT EXISTS / CREATE OR REPLACE.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles: one row per auth user, created by a trigger on signup.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text unique not null check (char_length(username) between 3 and 20),
  avatar_emoji  text not null default '🎲',
  rating        integer not null default 1000 check (rating >= 100),
  matches_played integer not null default 0,
  matches_won   integer not null default 0,
  best_streak   integer not null default 0,
  bonus_streak  integer not null default 0,
  last_bonus_at timestamptz,
  is_bot        boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists profiles_rating_idx on public.profiles (rating desc);

-- ---------------------------------------------------------------------------
-- Wallets: integer KES cents (no floating point money, ever).
-- ---------------------------------------------------------------------------
create table if not exists public.wallets (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  balance_cents  bigint not null default 0 check (balance_cents >= 0),
  pending_cents  bigint not null default 0 check (pending_cents >= 0),
  updated_at     timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  kind          text not null check (kind in
                  ('deposit','withdrawal','game_entry','game_win','bonus','refund','adjustment')),
  amount_cents  bigint not null,
  status        text not null default 'completed'
                  check (status in ('pending','completed','failed')),
  reference     text,
  description   text not null default '',
  created_at    timestamptz not null default now()
);

create index if not exists wallet_tx_user_idx
  on public.wallet_transactions (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Matches: authoritative record of every game, replayable from the log.
-- ---------------------------------------------------------------------------
create table if not exists public.matches (
  id             uuid primary key default gen_random_uuid(),
  mode           text not null check (mode in ('free','beast')),
  seed           bigint not null,
  entry_fee_cents bigint not null default 0,
  prize_pool_cents bigint not null default 0,
  winner_id      uuid references public.profiles (id),
  result_hash    text not null,
  replay         jsonb not null default '[]'::jsonb,
  finished_at    timestamptz not null default now()
);

create table if not exists public.match_players (
  match_id     uuid not null references public.matches (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  placement    integer not null,
  rating_before integer not null,
  rating_after  integer not null,
  captures     integer not null default 0,
  is_bot       boolean not null default false,
  primary key (match_id, user_id)
);

create index if not exists match_players_user_idx on public.match_players (user_id);

-- ---------------------------------------------------------------------------
-- Weekly tournaments: one active event per ISO week.
-- ---------------------------------------------------------------------------
create table if not exists public.tournaments (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.tournament_entries (
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  points        integer not null default 0,
  matches       integer not null default 0,
  updated_at    timestamptz not null default now(),
  primary key (tournament_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Leaderboard view: global, bots excluded.
-- ---------------------------------------------------------------------------
create or replace view public.leaderboard as
select
  p.id,
  p.username,
  p.avatar_emoji,
  p.rating,
  p.matches_played,
  p.matches_won,
  case when p.matches_played = 0 then 0
       else round(100.0 * p.matches_won / p.matches_played)::int end as win_rate,
  rank() over (order by p.rating desc) as position
from public.profiles p
where p.is_bot = false;

-- ---------------------------------------------------------------------------
-- Row level security: players read their own data, writes are server-side.
-- ---------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.wallets             enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.matches             enable row level security;
alter table public.match_players       enable row level security;
alter table public.tournaments         enable row level security;
alter table public.tournament_entries  enable row level security;

drop policy if exists "profiles are public read" on public.profiles;
create policy "profiles are public read"
  on public.profiles for select using (true);

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own wallet read" on public.wallets;
create policy "own wallet read"
  on public.wallets for select using (auth.uid() = user_id);

drop policy if exists "own transactions read" on public.wallet_transactions;
create policy "own transactions read"
  on public.wallet_transactions for select using (auth.uid() = user_id);

drop policy if exists "matches are public read" on public.matches;
create policy "matches are public read"
  on public.matches for select using (true);

drop policy if exists "match players are public read" on public.match_players;
create policy "match players are public read"
  on public.match_players for select using (true);

drop policy if exists "tournaments are public read" on public.tournaments;
create policy "tournaments are public read"
  on public.tournaments for select using (true);

drop policy if exists "tournament entries are public read" on public.tournament_entries;
create policy "tournament entries are public read"
  on public.tournament_entries for select using (true);

-- ---------------------------------------------------------------------------
-- Signup trigger: profile + wallet in one transaction.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_name text;
  final_name text;
  n int := 0;
begin
  base_name := coalesce(
    new.raw_user_meta_data ->> 'username',
    split_part(coalesce(new.email, 'player'), '@', 1)
  );
  final_name := left(regexp_replace(base_name, '[^a-zA-Z0-9_]', '', 'g'), 14);
  if final_name is null or char_length(final_name) < 3 then
    final_name := 'player' || substr(new.id::text, 1, 6);
  end if;

  while exists (select 1 from public.profiles where username = final_name) loop
    n := n + 1;
    final_name := left(final_name, 14) || n::text;
  end loop;

  insert into public.profiles (id, username, avatar_emoji)
  values (new.id, final_name, coalesce(new.raw_user_meta_data ->> 'avatar_emoji', '🎲'));

  insert into public.wallets (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Atomic helpers called only by the service role from server actions.
-- ---------------------------------------------------------------------------
create or replace function public.credit_wallet(
  p_user uuid,
  p_amount bigint,
  p_kind text,
  p_description text default '',
  p_reference text default null
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_balance bigint;
begin
  insert into public.wallets (user_id) values (p_user)
    on conflict (user_id) do nothing;

  update public.wallets
     set balance_cents = balance_cents + p_amount,
         updated_at = now()
   where user_id = p_user
  returning balance_cents into v_balance;

  if v_balance < 0 then
    raise exception 'insufficient_balance';
  end if;

  insert into public.wallet_transactions (user_id, kind, amount_cents, status, reference, description)
  values (p_user, p_kind, p_amount, 'completed', p_reference, p_description);

  return v_balance;
end;
$$;

revoke all on function public.credit_wallet(uuid, bigint, text, text, text) from public, anon, authenticated;
grant execute on function public.credit_wallet(uuid, bigint, text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Seed the bot roster so leaderboards always have rivals to chase.
-- ---------------------------------------------------------------------------
insert into public.profiles (id, username, avatar_emoji, rating, matches_played, matches_won, is_bot)
values
  ('00000000-0000-4000-8000-000000000001', 'Simba_254', '🦁', 1380, 64, 38, true),
  ('00000000-0000-4000-8000-000000000002', 'NairobiAce', '🃏', 1310, 51, 27, true),
  ('00000000-0000-4000-8000-000000000003', 'MombasaKing', '👑', 1255, 47, 22, true),
  ('00000000-0000-4000-8000-000000000004', 'KisumuSwift', '⚡', 1180, 39, 17, true),
  ('00000000-0000-4000-8000-000000000005', 'EldoretRider', '🏇', 1090, 28, 9, true)
on conflict (id) do nothing;

-- Increment tournament points without racing other writers.
create or replace function public.add_tournament_points(
  p_tournament uuid,
  p_user uuid,
  p_points integer
) returns void
language sql security definer set search_path = public as $$
  insert into public.tournament_entries (tournament_id, user_id, points, matches, updated_at)
  values (p_tournament, p_user, p_points, 1, now())
  on conflict (tournament_id, user_id) do update
    set points = public.tournament_entries.points + excluded.points,
        matches = public.tournament_entries.matches + 1,
        updated_at = now();
$$;

revoke all on function public.add_tournament_points(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.add_tournament_points(uuid, uuid, integer) to service_role;

-- Active tournament for the current ISO week, created on demand.
create or replace function public.ensure_current_tournament()
returns public.tournaments
language plpgsql security definer set search_path = public as $$
declare
  v_row public.tournaments;
  v_slug text;
  v_start timestamptz;
begin
  v_start := date_trunc('week', now());
  v_slug := 'week-' || to_char(v_start, 'IYYY-IW');

  select * into v_row from public.tournaments where slug = v_slug;
  if found then return v_row; end if;

  insert into public.tournaments (slug, title, starts_at, ends_at)
  values (
    v_slug,
    'Weekly Arena · ' || to_char(v_start, 'DD Mon'),
    v_start,
    v_start + interval '7 days'
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.ensure_current_tournament() to authenticated, service_role;
