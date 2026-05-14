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
  home_team text not null, away_team text not null, commence_time timestamptz,
  home numeric, draw numeric, away numeric,
  best_home numeric, best_draw numeric, best_away numeric,
  bookmakers jsonb, raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.teams_cache (
  name_key text primary key, name text not null,
  badge_url text, kit_url text, banner_url text,
  country text, country_code text, stadium text, founded text, description text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.team_stats_cache (
  team_key text primary key, team_name text not null,
  league text, league_id integer, season integer,
  force numeric, attack numeric, defense numeric, form text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.sync_log (
  id uuid primary key default gen_random_uuid(),
  job text not null, status text not null,
  items_added integer default 0, items_updated integer default 0,
  message text, duration_ms integer,
  started_at timestamptz not null default now(), finished_at timestamptz
);
alter table public.matches_cache enable row level security;
alter table public.odds_cache enable row level security;
alter table public.teams_cache enable row level security;
alter table public.team_stats_cache enable row level security;
alter table public.sync_log enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='matches_cache' and policyname='Public can read matches cache') then create policy "Public can read matches cache" on public.matches_cache for select using (true); end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='odds_cache' and policyname='Public can read odds cache') then create policy "Public can read odds cache" on public.odds_cache for select using (true); end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='teams_cache' and policyname='Public can read teams cache') then create policy "Public can read teams cache" on public.teams_cache for select using (true); end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='team_stats_cache' and policyname='Public can read team stats cache') then create policy "Public can read team stats cache" on public.team_stats_cache for select using (true); end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sync_log' and policyname='Public can read sync logs') then create policy "Public can read sync logs" on public.sync_log for select using (true); end if;
end $$;
create index if not exists idx_matches_cache_commence_time on public.matches_cache(commence_time);
create index if not exists idx_matches_cache_teams on public.matches_cache(home_team, away_team);
create index if not exists idx_odds_cache_commence_time on public.odds_cache(commence_time);
create index if not exists idx_sync_log_started_at on public.sync_log(started_at desc);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TABLE IF NOT EXISTS public.wina_matches (
  id TEXT PRIMARY KEY, sport_id INT NOT NULL, sport_name TEXT NOT NULL,
  tournament TEXT NOT NULL, category TEXT, title TEXT NOT NULL,
  home_team TEXT NOT NULL, away_team TEXT NOT NULL,
  home_logo TEXT, away_logo TEXT, home_jersey TEXT, away_jersey TEXT,
  status TEXT NOT NULL, match_start TIMESTAMPTZ NOT NULL,
  score TEXT, minute INT,
  odds_home NUMERIC, odds_draw NUMERIC, odds_away NUMERIC,
  payload JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wina_matches_sport_kickoff ON public.wina_matches (sport_id, match_start);
CREATE INDEX IF NOT EXISTS idx_wina_matches_status ON public.wina_matches (status);
CREATE INDEX IF NOT EXISTS idx_wina_matches_tournament ON public.wina_matches (tournament);
ALTER TABLE public.wina_matches ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wina_matches' AND policyname='Public read wina_matches') THEN
    CREATE POLICY "Public read wina_matches" ON public.wina_matches FOR SELECT USING (true);
  END IF;
END $$;
DROP TRIGGER IF EXISTS trg_wina_matches_updated ON public.wina_matches;
CREATE TRIGGER trg_wina_matches_updated BEFORE UPDATE ON public.wina_matches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.wina_sports (
  id INT PRIMARY KEY, name TEXT NOT NULL,
  count INT NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wina_sports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wina_sports' AND policyname='Public read wina_sports') THEN
    CREATE POLICY "Public read wina_sports" ON public.wina_sports FOR SELECT USING (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.wina_tournaments (
  name TEXT PRIMARY KEY, sport_id INT,
  count INT NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wina_tournaments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wina_tournaments' AND policyname='Public read wina_tournaments') THEN
    CREATE POLICY "Public read wina_tournaments" ON public.wina_tournaments FOR SELECT USING (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.magic_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_label TEXT, match_ids TEXT[] NOT NULL DEFAULT '{}',
  confidence INT NOT NULL DEFAULT 0,
  selections JSONB NOT NULL DEFAULT '[]'::jsonb,
  value_bets JSONB NOT NULL DEFAULT '[]'::jsonb,
  reasoning TEXT, alternative_system TEXT,
  kelly_stake NUMERIC, total_odds NUMERIC,
  mode TEXT NOT NULL DEFAULT 'standard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_magic_analyses_created ON public.magic_analyses (created_at DESC);
ALTER TABLE public.magic_analyses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='magic_analyses' AND policyname='Public read magic_analyses') THEN
    CREATE POLICY "Public read magic_analyses" ON public.magic_analyses FOR SELECT USING (true);
  END IF;
END $$;