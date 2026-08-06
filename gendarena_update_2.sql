-- ╔══════════════════════════════════════════════════════════════════╗
-- ║              🟠  CORE MIGRATION — READ BEFORE RUNNING  🟠       ║
-- ║                                                                  ║
-- ║  This is the primary migration for the judge/scoring system.    ║
-- ║  It is idempotent and safe to re-run, but note:                 ║
-- ║                                                                  ║
-- ║  EXECUTION ORDER MATTERS:                                        ║
-- ║    Run BEFORE: gendarena_update_3.sql                           ║
-- ║    Depends on: Base tables (profiles, submissions, teams)       ║
-- ║                created by schema_update.sql                     ║
-- ║                                                                  ║
-- ║  What this file sets up:                                        ║
-- ║    - Security helper functions (is_admin, is_judge, etc.)       ║
-- ║    - Profile extensions (facebook_url, avatar_url)              ║
-- ║    - scoring_config table + weight validation                   ║
-- ║    - judge_assignments table + RLS                              ║
-- ║    - scores table + weighted scoring trigger                    ║
-- ║    - leaderboard_view + get_leaderboard() function             ║
-- ║    - Storage: avatars bucket + policies                         ║
-- ║                                                                  ║
-- ║  gendarena_update_3.sql extends and overrides some triggers     ║
-- ║  defined here. Both files must be applied for full behavior.   ║
-- ║                                                                  ║
-- ║  See audit: SQL_MIGRATIONS_README.md                            ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════════
-- GEND ARENA UPDATE #2
-- Judge branch, scoring config, profile extensions, RLS
-- Idempotent — safe to run multiple times.
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Security definer helpers ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_judge()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'judge'
  );
$$;

-- ─── 2. Profile extensions ─────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_facebook_url_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_facebook_url_check
  CHECK (
    facebook_url IS NULL
    OR facebook_url ~* '^https?://(www\.)?(facebook|fb)\.com/.+'
  );

CREATE OR REPLACE FUNCTION public.profiles_prevent_role_self_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() = OLD.id AND NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Cannot change your own role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_role_self_change ON public.profiles;
CREATE TRIGGER profiles_prevent_role_self_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_prevent_role_self_change();

-- ─── 3. Scoring config ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.scoring_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID REFERENCES public.competitions(id) ON DELETE SET NULL,
  is_open BOOLEAN NOT NULL DEFAULT false,
  innovation_weight NUMERIC(5,2) NOT NULL DEFAULT 25 CHECK (innovation_weight >= 0),
  feasibility_weight NUMERIC(5,2) NOT NULL DEFAULT 25 CHECK (feasibility_weight >= 0),
  presentation_weight NUMERIC(5,2) NOT NULL DEFAULT 25 CHECK (presentation_weight >= 0),
  impact_weight NUMERIC(5,2) NOT NULL DEFAULT 25 CHECK (impact_weight >= 0),
  rubric_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE OR REPLACE FUNCTION public.scoring_config_validate_weights()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  total NUMERIC;
BEGIN
  total := NEW.innovation_weight + NEW.feasibility_weight
         + NEW.presentation_weight + NEW.impact_weight;
  IF total <> 100 THEN
    RAISE EXCEPTION 'Scoring weights must sum to 100 (got %)', total;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scoring_config_validate_weights ON public.scoring_config;
CREATE TRIGGER scoring_config_validate_weights
  BEFORE INSERT OR UPDATE ON public.scoring_config
  FOR EACH ROW EXECUTE FUNCTION public.scoring_config_validate_weights();

INSERT INTO public.scoring_config (is_open)
SELECT false
WHERE NOT EXISTS (SELECT 1 FROM public.scoring_config LIMIT 1);

CREATE OR REPLACE FUNCTION public.is_scoring_open()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_open FROM public.scoring_config ORDER BY updated_at DESC NULLS LAST LIMIT 1),
    false
  );
$$;

-- ─── 4. Judge assignments ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.judge_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (judge_id, submission_id)
);

CREATE INDEX IF NOT EXISTS idx_judge_assignments_judge
  ON public.judge_assignments(judge_id);
CREATE INDEX IF NOT EXISTS idx_judge_assignments_submission
  ON public.judge_assignments(submission_id);

CREATE OR REPLACE FUNCTION public.judge_is_assigned(p_submission_id UUID, p_judge_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.judge_assignments
    WHERE submission_id = p_submission_id AND judge_id = p_judge_id
  );
$$;

-- ─── 5. Scores table (phase-based submissions) ───────────────────

CREATE TABLE IF NOT EXISTS public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  innovation_score NUMERIC(4,2) NOT NULL CHECK (innovation_score >= 0 AND innovation_score <= 10),
  feasibility_score NUMERIC(4,2) NOT NULL CHECK (feasibility_score >= 0 AND feasibility_score <= 10),
  presentation_score NUMERIC(4,2) NOT NULL CHECK (presentation_score >= 0 AND presentation_score <= 10),
  impact_score NUMERIC(4,2) NOT NULL CHECK (impact_score >= 0 AND impact_score <= 10),
  total_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (submission_id, judge_id)
);

CREATE OR REPLACE FUNCTION public.compute_weighted_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  cfg public.scoring_config%ROWTYPE;
BEGIN
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
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scores_compute_weighted ON public.scores;
CREATE TRIGGER scores_compute_weighted
  BEFORE INSERT OR UPDATE ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.compute_weighted_score();

CREATE OR REPLACE FUNCTION public.enforce_score_business_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NOT public.is_scoring_open() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Scoring window is closed';
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') AND NOT public.is_admin() THEN
    IF NEW.judge_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Cannot score on behalf of another judge';
    END IF;
    IF NOT public.judge_is_assigned(NEW.submission_id, NEW.judge_id) THEN
      RAISE EXCEPTION 'Judge is not assigned to this submission';
    END IF;
    IF NOT public.is_scoring_open() THEN
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

-- ─── 6. Leaderboard view (admin-only via RLS below) ──────────────

CREATE OR REPLACE VIEW public.leaderboard_view AS
SELECT
  s.id AS submission_id,
  s.team_id,
  s.phase_id,
  t.name AS team_name,
  cp.title AS phase_title,
  ROUND(AVG(sc.total_score)::numeric, 2) AS avg_score,
  COUNT(sc.id)::int AS judge_count
FROM public.submissions s
JOIN public.teams t ON t.id = s.team_id
LEFT JOIN public.competition_phases cp ON cp.id = s.phase_id
LEFT JOIN public.scores sc ON sc.submission_id = s.id
GROUP BY s.id, s.team_id, s.phase_id, t.name, cp.title
HAVING COUNT(sc.id) > 0;

-- ─── 7. RLS ──────────────────────────────────────────────────────

ALTER TABLE public.scoring_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judge_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- scoring_config
DROP POLICY IF EXISTS "scoring_config_select_authenticated" ON public.scoring_config;
CREATE POLICY "scoring_config_select_authenticated"
  ON public.scoring_config FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "scoring_config_admin_write" ON public.scoring_config;
CREATE POLICY "scoring_config_admin_write"
  ON public.scoring_config FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- judge_assignments
DROP POLICY IF EXISTS "judge_assignments_admin_all" ON public.judge_assignments;
CREATE POLICY "judge_assignments_admin_all"
  ON public.judge_assignments FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "judge_assignments_judge_select_own" ON public.judge_assignments;
CREATE POLICY "judge_assignments_judge_select_own"
  ON public.judge_assignments FOR SELECT TO authenticated
  USING (public.is_judge() AND judge_id = auth.uid());

-- scores
DROP POLICY IF EXISTS "scores_admin_all" ON public.scores;
CREATE POLICY "scores_admin_all"
  ON public.scores FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "scores_judge_select_own" ON public.scores;
CREATE POLICY "scores_judge_select_own"
  ON public.scores FOR SELECT TO authenticated
  USING (public.is_judge() AND judge_id = auth.uid());

DROP POLICY IF EXISTS "scores_judge_insert_own" ON public.scores;
CREATE POLICY "scores_judge_insert_own"
  ON public.scores FOR INSERT TO authenticated
  WITH CHECK (
    public.is_judge()
    AND judge_id = auth.uid()
    AND public.judge_is_assigned(submission_id, auth.uid())
    AND public.is_scoring_open()
  );

DROP POLICY IF EXISTS "scores_judge_update_own" ON public.scores;
CREATE POLICY "scores_judge_update_own"
  ON public.scores FOR UPDATE TO authenticated
  USING (
    public.is_judge()
    AND judge_id = auth.uid()
    AND public.judge_is_assigned(submission_id, auth.uid())
    AND public.is_scoring_open()
  )
  WITH CHECK (
    public.is_judge()
    AND judge_id = auth.uid()
    AND public.judge_is_assigned(submission_id, auth.uid())
    AND public.is_scoring_open()
  );

-- submissions: judge sees assigned only (additive policy)
DROP POLICY IF EXISTS "submissions_judge_select_assigned" ON public.submissions;
CREATE POLICY "submissions_judge_select_assigned"
  ON public.submissions FOR SELECT TO authenticated
  USING (
    public.is_judge()
    AND public.judge_is_assigned(id, auth.uid())
  );

DROP POLICY IF EXISTS "submissions_admin_all" ON public.submissions;
CREATE POLICY "submissions_admin_all"
  ON public.submissions FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- profiles: users update own (non-role fields)
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- leaderboard_view — grant select to authenticated, restrict via view security
-- Use a wrapper function for admin-only leaderboard reads
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS SETOF public.leaderboard_view
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.leaderboard_view
  WHERE public.is_admin();
$$;

REVOKE ALL ON public.leaderboard_view FROM PUBLIC;
GRANT SELECT ON public.leaderboard_view TO authenticated;

DROP POLICY IF EXISTS "leaderboard_view_admin_only" ON public.leaderboard_view;
-- Views use security_invoker in PG15+; function get_leaderboard() is the safe entry point.

-- ─── 8. Storage: avatars bucket ───────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_user_insert_own" ON storage.objects;
CREATE POLICY "avatars_user_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_user_update_own" ON storage.objects;
CREATE POLICY "avatars_user_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_user_delete_own" ON storage.objects;
CREATE POLICY "avatars_user_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
