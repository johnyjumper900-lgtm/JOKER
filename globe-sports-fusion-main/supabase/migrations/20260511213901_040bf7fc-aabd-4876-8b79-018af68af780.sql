
create table if not exists public.matches_cache (
  match_key text primary key,
  home_team text not null,
  away_team text not null,
  league text,
  country text,
  commence_time timestamptz not null,
  paris_date text,
  paris_time text,
  source text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.odds_cache (
  match_key text primary key references public.matches_cache(match_key) on delete cascade,
  home_team text not null,
  away_team text not null,
  commence_time timestamptz,
  home numeric, draw numeric, away numeric,
  best_home numeric, best_draw numeric, best_away numeric,
  bookmakers jsonb,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams_cache (
  name_key text primary key,
  name text not null,
  badge_url text, kit_url text, banner_url text,
  country text, country_code text, stadium text, founded text, description text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_stats_cache (
  team_key text primary key,
  team_name text not null,
  league text, league_id integer, season integer,
  force numeric, attack numeric, defense numeric, form text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_log (
  id uuid primary key default gen_random_uuid(),
  job text not null, status text not null,
  items_added integer default 0, items_updated integer default 0,
  message text, duration_ms integer,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table public.matches_cache enable row level security;
alter table public.odds_cache enable row level security;
alter table public.teams_cache enable row level security;
alter table public.team_stats_cache enable row level security;
alter table public.sync_log enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='matches_cache' and policyname='Public can read matches cache') then
    create policy "Public can read matches cache" on public.matches_cache for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='odds_cache' and policyname='Public can read odds cache') then
    create policy "Public can read odds cache" on public.odds_cache for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='teams_cache' and policyname='Public can read teams cache') then
    create policy "Public can read teams cache" on public.teams_cache for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='team_stats_cache' and policyname='Public can read team stats cache') then
    create policy "Public can read team stats cache" on public.team_stats_cache for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sync_log' and policyname='Public can read sync logs') then
    create policy "Public can read sync logs" on public.sync_log for select using (true);
  end if;
end $$;

create index if not exists idx_matches_cache_commence_time on public.matches_cache(commence_time);
create index if not exists idx_matches_cache_teams on public.matches_cache(home_team, away_team);
create index if not exists idx_odds_cache_commence_time on public.odds_cache(commence_time);
create index if not exists idx_sync_log_started_at on public.sync_log(started_at desc);
