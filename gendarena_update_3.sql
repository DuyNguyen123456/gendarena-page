-- ═══════════════════════════════════════════
-- GEND ARENA UPDATE #3
-- Fix profile role updates, enable dynamic scoring rounds/criteria, and support judge routing.
-- Idempotent update script.
-- ═══════════════════════════════════════════

-- 1. Profile RLS / admin role updates
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
CREATE POLICY "profiles_select_self"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_insert_authenticated" ON public.profiles;
CREATE POLICY "profiles_insert_authenticated"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- 2. Dynamic scoring round / criteria schema
CREATE TABLE IF NOT EXISTS public.scoring_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID REFERENCES public.competition_phases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  rubric_url TEXT,
  scoring_open BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist even if the table was created before this script update (idempotency)
ALTER TABLE public.scoring_rounds
  ADD COLUMN IF NOT EXISTS rubric_url TEXT,
  ADD COLUMN IF NOT EXISTS scoring_open BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_scoring_rounds_phase_id ON public.scoring_rounds(phase_id);

CREATE TABLE IF NOT EXISTS public.scoring_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.scoring_rounds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (weight >= 0),
  max_score NUMERIC(5,2) NOT NULL DEFAULT 10 CHECK (max_score > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scoring_criteria_round_id ON public.scoring_criteria(round_id);

CREATE OR REPLACE FUNCTION public.validate_scoring_round_weights(p_round_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  total_weight NUMERIC;
BEGIN
  SELECT COALESCE(SUM(weight), 0) INTO total_weight
  FROM public.scoring_criteria
  WHERE round_id = p_round_id;

  IF total_weight > 100 THEN
    RAISE EXCEPTION 'Total weights for scoring round % cannot exceed 100 (got %)', p_round_id, total_weight;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.score_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criteria_id UUID NOT NULL REFERENCES public.scoring_criteria(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value NUMERIC(5,2) NOT NULL CHECK (value >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_score_levels_criteria_id ON public.score_levels(criteria_id);

ALTER TABLE public.scores
  ADD COLUMN IF NOT EXISTS round_id UUID REFERENCES public.scoring_rounds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS criteria_scores JSONB NOT NULL DEFAULT '{}';

-- 3. Track updated_at on the dynamic scoring tables
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scoring_rounds_updated_at ON public.scoring_rounds;
CREATE TRIGGER scoring_rounds_updated_at
  BEFORE UPDATE ON public.scoring_rounds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS scoring_criteria_updated_at ON public.scoring_criteria;
CREATE TRIGGER scoring_criteria_updated_at
  BEFORE UPDATE ON public.scoring_criteria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS score_levels_updated_at ON public.score_levels;
CREATE TRIGGER score_levels_updated_at
  BEFORE UPDATE ON public.score_levels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Use dynamic criteria_scores when present and fallback to legacy fields
CREATE OR REPLACE FUNCTION public.compute_weighted_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  cfg public.scoring_config%ROWTYPE;
  score_sum NUMERIC := 0;
  total_score NUMERIC := 0;
BEGIN
  IF NEW.criteria_scores IS NOT NULL
     AND jsonb_typeof(NEW.criteria_scores) = 'object'
     AND NEW.criteria_scores <> '{}' THEN
    IF NEW.round_id IS NULL THEN
      RAISE EXCEPTION 'Dynamic scoring requires round_id';
    END IF;

    SELECT COALESCE(SUM((kv.value::numeric * c.weight / c.max_score)), 0) / 10
    INTO total_score
    FROM jsonb_each_text(NEW.criteria_scores) AS kv(key, value)
    JOIN public.scoring_criteria c
      ON c.id::text = kv.key
     AND c.round_id = NEW.round_id;

    NEW.total_score := COALESCE(total_score, 0);
  ELSE
    SELECT * INTO cfg FROM public.scoring_config ORDER BY updated_at DESC NULLS LAST LIMIT 1;
    IF NOT FOUND THEN
      NEW.total_score := (NEW.innovation_score + NEW.feasibility_score
                        + NEW.presentation_score + NEW.impact_score) / 4;
    ELSE
      NEW.total_score := (
        NEW.innovation_score * cfg.innovation_weight
        + NEW.feasibility_score * cfg.feasibility_weight
        + NEW.presentation_score * cfg.presentation_weight
        + NEW.impact_score * cfg.impact_weight
      ) / 100;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scores_compute_weighted ON public.scores;
CREATE TRIGGER scores_compute_weighted
  BEFORE INSERT OR UPDATE ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.compute_weighted_score();

-- 5. RLS for dynamic scoring tables
ALTER TABLE public.scoring_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scoring_rounds_select_authenticated" ON public.scoring_rounds;
CREATE POLICY "scoring_rounds_select_authenticated"
  ON public.scoring_rounds FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "scoring_rounds_admin_write" ON public.scoring_rounds;
CREATE POLICY "scoring_rounds_admin_write"
  ON public.scoring_rounds FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "scoring_criteria_select_authenticated" ON public.scoring_criteria;
CREATE POLICY "scoring_criteria_select_authenticated"
  ON public.scoring_criteria FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "scoring_criteria_admin_write" ON public.scoring_criteria;
CREATE POLICY "scoring_criteria_admin_write"
  ON public.scoring_criteria FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "score_levels_select_authenticated" ON public.score_levels;
CREATE POLICY "score_levels_select_authenticated"
  ON public.score_levels FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "score_levels_admin_write" ON public.score_levels;
CREATE POLICY "score_levels_admin_write"
  ON public.score_levels FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6. Enforce dynamic scoring round business rules
CREATE OR REPLACE FUNCTION public.enforce_score_business_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scoring_open BOOLEAN;
BEGIN
  -- If using dynamic scoring rounds (has round_id)
  IF NEW.round_id IS NOT NULL THEN
    SELECT scoring_open INTO v_scoring_open
    FROM public.scoring_rounds
    WHERE id = NEW.round_id;
  ELSE
    -- Fallback to legacy global scoring config
    v_scoring_open := public.is_scoring_open();
  END IF;

  IF TG_OP = 'INSERT' AND NOT COALESCE(v_scoring_open, false) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Scoring window is closed';
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') AND NOT public.is_admin() THEN
    IF NEW.judge_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Cannot score on behalf of another judge';
    END IF;
    IF NOT public.judge_is_assigned(NEW.submission_id, NEW.judge_id) THEN
      RAISE EXCEPTION 'Judge is not assigned to this submission';
    END IF;
    IF NOT COALESCE(v_scoring_open, false) THEN
      RAISE EXCEPTION 'Scoring window is closed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scores_enforce_business_rules ON public.scores;
CREATE TRIGGER scores_enforce_business_rules
  BEFORE INSERT OR UPDATE ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.enforce_score_business_rules();

