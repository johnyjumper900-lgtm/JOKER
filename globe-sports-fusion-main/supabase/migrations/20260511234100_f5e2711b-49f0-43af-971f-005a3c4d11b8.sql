
-- Trigger helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Matches Winamax
CREATE TABLE public.wina_matches (
  id TEXT PRIMARY KEY,
  sport_id INT NOT NULL,
  sport_name TEXT NOT NULL,
  tournament TEXT NOT NULL,
  category TEXT,
  title TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_logo TEXT,
  away_logo TEXT,
  home_jersey TEXT,
  away_jersey TEXT,
  status TEXT NOT NULL,
  match_start TIMESTAMPTZ NOT NULL,
  score TEXT,
  minute INT,
  odds_home NUMERIC,
  odds_draw NUMERIC,
  odds_away NUMERIC,
  payload JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wina_matches_sport_kickoff ON public.wina_matches (sport_id, match_start);
CREATE INDEX idx_wina_matches_status ON public.wina_matches (status);
CREATE INDEX idx_wina_matches_tournament ON public.wina_matches (tournament);

ALTER TABLE public.wina_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read wina_matches" ON public.wina_matches FOR SELECT USING (true);

CREATE TRIGGER trg_wina_matches_updated
BEFORE UPDATE ON public.wina_matches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sports
CREATE TABLE public.wina_sports (
  id INT PRIMARY KEY,
  name TEXT NOT NULL,
  count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wina_sports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read wina_sports" ON public.wina_sports FOR SELECT USING (true);

-- Tournaments
CREATE TABLE public.wina_tournaments (
  name TEXT PRIMARY KEY,
  sport_id INT,
  count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wina_tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read wina_tournaments" ON public.wina_tournaments FOR SELECT USING (true);

-- Magic analyses
CREATE TABLE public.magic_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_label TEXT,
  match_ids TEXT[] NOT NULL DEFAULT '{}',
  confidence INT NOT NULL DEFAULT 0,
  selections JSONB NOT NULL DEFAULT '[]'::jsonb,
  value_bets JSONB NOT NULL DEFAULT '[]'::jsonb,
  reasoning TEXT,
  alternative_system TEXT,
  kelly_stake NUMERIC,
  total_odds NUMERIC,
  mode TEXT NOT NULL DEFAULT 'standard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_magic_analyses_created ON public.magic_analyses (created_at DESC);
ALTER TABLE public.magic_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read magic_analyses" ON public.magic_analyses FOR SELECT USING (true);
