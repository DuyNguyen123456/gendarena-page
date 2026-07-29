-- ═══════════════════════════════════════════════════════════════════
-- GEND ARENA — Fix Scoring Gate & Assignment Status Migration
-- Safe to re-run (idempotent via IF NOT EXISTS / IF EXISTS guards).
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Add scoring window columns to competition_phases ────────────
-- Admin will control whether scoring is open for each phase directly
-- on /admin/phases alongside submission_open.

ALTER TABLE public.competition_phases
  ADD COLUMN IF NOT EXISTS scoring_open BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scoring_opens_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scoring_closes_at TIMESTAMPTZ;

-- ─── 2. Trigger to sync competition_phases.scoring_open → scoring_rounds ────
-- Automatically updates scoring_rounds.scoring_open whenever Admin
-- toggles scoring_open on a competition_phase.

CREATE OR REPLACE FUNCTION public.sync_phase_scoring_open()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.scoring_open IS DISTINCT FROM OLD.scoring_open THEN
    UPDATE public.scoring_rounds
      SET scoring_open = NEW.scoring_open,
          updated_at = now()
      WHERE phase_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_phase_scoring_open ON public.competition_phases;

CREATE TRIGGER trigger_sync_phase_scoring_open
  AFTER UPDATE OF scoring_open ON public.competition_phases
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_phase_scoring_open();

-- ─── 3. Ensure default scoring_round exists for all phases ──────────
INSERT INTO public.scoring_rounds (phase_id, title, description, scoring_open, sort_order, is_active)
SELECT 
  cp.id,
  cp.title,
  cp.description,
  cp.scoring_open,
  cp.display_order,
  true
FROM public.competition_phases cp
WHERE NOT EXISTS (
  SELECT 1 FROM public.scoring_rounds sr WHERE sr.phase_id = cp.id
);

-- ─── 4. Ensure index on judge_assignments ───────────────────────────
CREATE INDEX IF NOT EXISTS idx_judge_assignments_sub_id ON public.judge_assignments(submission_id);

-- ─── 5. Verification queries ─────────────────────────────────────────
-- SELECT id, title, submission_open, scoring_open, scoring_opens_at, scoring_closes_at
--   FROM public.competition_phases;
