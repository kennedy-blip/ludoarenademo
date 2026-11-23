-- Ludo Arena KE — engagement + money ledger schema
--
-- IMPORTANT: every object is prefixed `ludo_`. The Supabase project this runs
-- against is shared with other apps (trans_jules, nexusapk, helioforge, ...), so
-- generic names like `profiles` or `matches` would collide. Prefixing also makes
-- the whole feature set removable in one statement.
--
-- Apply with:  psql "$SUPABASE_DB_URL" -f web/supabase/migrations/0001_ludo_engagement.sql
-- Safe to re-run: every object uses IF NOT EXISTS / CREATE OR REPLACE.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles: one row per auth user, created by a trigger on signup.
-- ---------------------------------------------------------------------------
create table if not exists public.ludo_profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  username       text unique not null check (char_length(username) between 3 and 20),
  avatar_emoji   text not null default '🎲',
  rating         integer not null default 1000 check (rating >= 100),
  matches_played integer not null default 0,
  matches_won    integer not null default 0,
  best_streak    integer not null default 0,
  bonus_streak   integer not null default 0,
  last_bonus_at  timestamptz,
  is_bot         boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists ludo_profiles_rating_idx on public.ludo_profiles (rating desc);

-- ---------------------------------------------------------------------------
-- Wallets: integer KES cents (no floating point money, ever).
-- ---------------------------------------------------------------------------
create table if not exists public.ludo_wallets (
  user_id       uuid primary key references public.ludo_profiles (id) on delete cascade,
  balance_cents bigint not null default 0 check (balance_cents >= 0),
  pending_cents bigint not null default 0 check (pending_cents >= 0),
  updated_at    timestamptz not null default now()
);

create table if not exists public.ludo_wallet_transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.ludo_profiles (id) on delete cascade,
  kind         text not null check (kind in
                 ('deposit','withdrawal','game_entry','game_win','bonus','refund','adjustment')),
  amount_cents bigint not null,
  status       text not null default 'completed'
                 check (status in ('pending','completed','failed')),
  reference    text,
  description  text not null default '',
  created_at   timestamptz not null default now()
);

create index if not exists ludo_wallet_tx_user_idx
  on public.ludo_wallet_transactions (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Matches: authoritative record of every game, replayable from the log.
-- ---------------------------------------------------------------------------
create table if not exists public.ludo_matches (
  id               uuid primary key default gen_random_uuid(),
  mode             text not null check (mode in ('free','beast')),
  seed             bigint not null,
  entry_fee_cents  bigint not null default 0,
  prize_pool_cents bigint not null default 0,
  winner_id        uuid references public.ludo_profiles (id),
  result_hash      text not null,
  replay           jsonb not null default '[]'::jsonb,
  finished_at      timestamptz not null default now()
);

create table if not exists public.ludo_match_players (
  match_id      uuid not null references public.ludo_matches (id) on delete cascade,
  user_id       uuid not null references public.ludo_profiles (id) on delete cascade,
  placement     integer not null,
  rating_before integer not null,
  rating_after  integer not null,
  captures      integer not null default 0,
  is_bot        boolean not null default false,
  primary key (match_id, user_id)
);

create index if not exists ludo_match_players_user_idx
  on public.ludo_match_players (user_id);

-- ---------------------------------------------------------------------------
-- Weekly tournaments: one event per ISO week, created on demand.
-- ---------------------------------------------------------------------------
create table if not exists public.ludo_tournaments (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  title      text not null,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ludo_tournament_entries (
  tournament_id uuid not null references public.ludo_tournaments (id) on delete cascade,
  user_id       uuid not null references public.ludo_profiles (id) on delete cascade,
  points        integer not null default 0,
  matches       integer not null default 0,
  updated_at    timestamptz not null default now(),
  primary key (tournament_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Leaderboard view: global, bots excluded.
-- ---------------------------------------------------------------------------
create or replace view public.ludo_leaderboard as
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
from public.ludo_profiles p
where p.is_bot = false;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.ludo_profiles            enable row level security;
alter table public.ludo_wallets             enable row level security;
alter table public.ludo_wallet_transactions enable row level security;
alter table public.ludo_matches             enable row level security;
alter table public.ludo_match_players       enable row level security;
alter table public.ludo_tournaments         enable row level security;
alter table public.ludo_tournament_entries  enable row level security;

drop policy if exists "ludo profiles public read" on public.ludo_profiles;
create policy "ludo profiles public read"
  on public.ludo_profiles for select using (true);

drop policy if exists "ludo own profile update" on public.ludo_profiles;
create policy "ludo own profile update"
  on public.ludo_profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "ludo own wallet read" on public.ludo_wallets;
create policy "ludo own wallet read"
  on public.ludo_wallets for select using (auth.uid() = user_id);

drop policy if exists "ludo own transactions read" on public.ludo_wallet_transactions;
create policy "ludo own transactions read"
  on public.ludo_wallet_transactions for select using (auth.uid() = user_id);

drop policy if exists "ludo matches public read" on public.ludo_matches;
create policy "ludo matches public read"
  on public.ludo_matches for select using (true);

drop policy if exists "ludo match players public read" on public.ludo_match_players;
create policy "ludo match players public read"
  on public.ludo_match_players for select using (true);

drop policy if exists "ludo tournaments public read" on public.ludo_tournaments;
create policy "ludo tournaments public read"
  on public.ludo_tournaments for select using (true);

drop policy if exists "ludo tournament entries public read" on public.ludo_tournament_entries;
create policy "ludo tournament entries public read"
  on public.ludo_tournament_entries for select using (true);

-- The view must be readable by anon/authenticated (RLS applies to the base table).
grant select on public.ludo_leaderboard to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Signup trigger: profile + wallet in one transaction.
-- ---------------------------------------------------------------------------
create or replace function public.ludo_handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_name  text;
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

  while exists (select 1 from public.ludo_profiles where username = final_name) loop
    n := n + 1;
    final_name := left(final_name, 14) || n::text;
  end loop;

  insert into public.ludo_profiles (id, username, avatar_emoji)
  values (new.id, final_name, coalesce(new.raw_user_meta_data ->> 'avatar_emoji', '🎲'))
  on conflict (id) do nothing;

  insert into public.ludo_wallets (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_ludo on auth.users;
create trigger on_auth_user_created_ludo
  after insert on auth.users
  for each row execute function public.ludo_handle_new_user();

-- ---------------------------------------------------------------------------
-- Atomic helpers, service-role only.
-- ---------------------------------------------------------------------------
create or replace function public.ludo_credit_wallet(
  p_user        uuid,
  p_amount      bigint,
  p_kind        text,
  p_description text default '',
  p_reference   text default null
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_balance bigint;
begin
  insert into public.ludo_wallets (user_id) values (p_user)
    on conflict (user_id) do nothing;

  update public.ludo_wallets
     set balance_cents = balance_cents + p_amount,
         updated_at = now()
   where user_id = p_user
  returning balance_cents into v_balance;

  if v_balance < 0 then
    raise exception 'insufficient_balance';
  end if;

  insert into public.ludo_wallet_transactions
    (user_id, kind, amount_cents, status, reference, description)
  values
    (p_user, p_kind, p_amount, 'completed', p_reference, p_description);

  return v_balance;
end;
$$;

create or replace function public.ludo_add_tournament_points(
  p_tournament uuid,
  p_user       uuid,
  p_points     integer
) returns void
language sql security definer set search_path = public as $$
  insert into public.ludo_tournament_entries
    (tournament_id, user_id, points, matches, updated_at)
  values (p_tournament, p_user, p_points, 1, now())
  on conflict (tournament_id, user_id) do update
    set points  = public.ludo_tournament_entries.points + excluded.points,
        matches = public.ludo_tournament_entries.matches + 1,
        updated_at = now();
$$;

create or replace function public.ludo_ensure_current_tournament()
returns public.ludo_tournaments
language plpgsql security definer set search_path = public as $$
declare
  v_row   public.ludo_tournaments;
  v_slug  text;
  v_start timestamptz;
begin
  v_start := date_trunc('week', now());
  v_slug  := 'week-' || to_char(v_start, 'IYYY-IW');

  select * into v_row from public.ludo_tournaments where slug = v_slug;
  if found then return v_row; end if;

  insert into public.ludo_tournaments (slug, title, starts_at, ends_at)
  values (v_slug, 'Weekly Arena · ' || to_char(v_start, 'DD Mon'), v_start, v_start + interval '7 days')
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.ludo_credit_wallet(uuid, bigint, text, text, text) from public, anon, authenticated;
revoke all on function public.ludo_add_tournament_points(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.ludo_ensure_current_tournament() from public, anon, authenticated;

grant execute on function public.ludo_credit_wallet(uuid, bigint, text, text, text) to service_role;
grant execute on function public.ludo_add_tournament_points(uuid, uuid, integer) to service_role;
grant execute on function public.ludo_ensure_current_tournament() to service_role;

-- ---------------------------------------------------------------------------
-- Demo rivals so the ladder is never empty.
-- ---------------------------------------------------------------------------
insert into public.ludo_profiles (id, username, avatar_emoji, rating, matches_played, matches_won, is_bot)
values
  ('00000000-0000-4000-8000-000000000001', 'Simba_254',   '🦁', 1380, 64, 38, true),
  ('00000000-0000-4000-8000-000000000002', 'NairobiAce',  '🃏', 1310, 51, 27, true),
  ('00000000-0000-4000-8000-000000000003', 'MombasaKing', '👑', 1255, 47, 22, true),
  ('00000000-0000-4000-8000-000000000004', 'KisumuSwift', '⚡', 1180, 39, 17, true),
  ('00000000-0000-4000-8000-000000000005', 'EldoretRider','🏇', 1090, 28,  9, true)
on conflict (id) do nothing;
