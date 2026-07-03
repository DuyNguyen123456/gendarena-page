-- ═══════════════════════════════════════════════════════════════════
-- GEND ARENA - SUBMISSIONS & SCORES RLS FIXES
-- Run this in your Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Enable RLS on submissions table
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "submissions_admin_all" ON public.submissions;
DROP POLICY IF EXISTS "submissions_judge_select_assigned" ON public.submissions;
DROP POLICY IF EXISTS "Submissions viewable by authenticated" ON public.submissions;
DROP POLICY IF EXISTS "Submissions insertable by team members" ON public.submissions;
DROP POLICY IF EXISTS "Submissions updatable by team members" ON public.submissions;
DROP POLICY IF EXISTS "submissions_team_select" ON public.submissions;
DROP POLICY IF EXISTS "submissions_team_insert" ON public.submissions;
DROP POLICY IF EXISTS "submissions_team_update" ON public.submissions;

-- 3. Create updated RLS policies for submissions
-- 3.1. Admin policy: Full access
CREATE POLICY "submissions_admin_all"
  ON public.submissions FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3.2. Judge policy: Read-only access to assigned submissions
CREATE POLICY "submissions_judge_select_assigned"
  ON public.submissions FOR SELECT TO authenticated
  USING (
    public.is_judge()
    AND public.judge_is_assigned(id, auth.uid())
  );

-- 3.3. Contestant policy: Read own team's submissions
CREATE POLICY "submissions_team_select"
  ON public.submissions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE user_id = auth.uid() AND team_id = submissions.team_id
    )
  );

-- 3.4. Contestant policy: Insert own team's submissions
CREATE POLICY "submissions_team_insert"
  ON public.submissions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE user_id = auth.uid() AND team_id = team_id
    )
  );

-- 3.5. Contestant policy: Update own team's submissions
CREATE POLICY "submissions_team_update"
  ON public.submissions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE user_id = auth.uid() AND team_id = submissions.team_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE user_id = auth.uid() AND team_id = submissions.team_id
    )
  );

-- 4. Re-enforce score RLS rules (ensuring admin has all, judge has limited)
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
