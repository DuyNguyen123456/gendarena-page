-- ═══════════════════════════════════════════════════════════════════
-- GEND ARENA — Fix Dataflow & Judge Expertise Migration
-- Run this ONCE in Supabase SQL Editor.
-- Safe to re-run (idempotent via IF NOT EXISTS / IF EXISTS guards).
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Fix missing FK: submissions.phase_id → competition_phases.id ───────
-- This was the ROOT CAUSE of /admin/assign showing 0 submissions while
-- /admin/submissions shows the correct count. PostgREST cannot resolve
-- the relationship without a FK constraint, so the join query fails silently.

-- 1a. Remove any orphaned submissions that reference non-existent phases
--     (so FK creation doesn't fail on existing data)
DELETE FROM public.submissions
  WHERE phase_id IS NOT NULL
    AND phase_id NOT IN (SELECT id FROM public.competition_phases);

DELETE FROM public.submission_history
  WHERE phase_id IS NOT NULL
    AND phase_id NOT IN (SELECT id FROM public.competition_phases);

-- 1b. Add the FK constraint on submissions
ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_phase_id_fkey;

ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_phase_id_fkey
  FOREIGN KEY (phase_id)
  REFERENCES public.competition_phases(id)
  ON DELETE CASCADE;

-- 1c. Add the FK constraint on submission_history
ALTER TABLE public.submission_history
  DROP CONSTRAINT IF EXISTS submission_history_phase_id_fkey;

ALTER TABLE public.submission_history
  ADD CONSTRAINT submission_history_phase_id_fkey
  FOREIGN KEY (phase_id)
  REFERENCES public.competition_phases(id)
  ON DELETE CASCADE;

-- ─── 2. Add expertise column to profiles for Judge expertise areas ──────────
-- Stores an array of TopicCategory strings (same 5 topics as submission topics).
-- Empty array by default. NULL is treated as empty.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expertise TEXT[] NOT NULL DEFAULT '{}';

-- ─── 3. Create index for performance ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_submissions_phase_id ON public.submissions(phase_id);
CREATE INDEX IF NOT EXISTS idx_submission_history_phase_id ON public.submission_history(phase_id);

-- ─── 4. Verify ──────────────────────────────────────────────────────────────
-- Run these SELECT statements to verify the migration succeeded:
--
-- SELECT conname, contype FROM pg_constraint
--   WHERE conname IN ('submissions_phase_id_fkey', 'submission_history_phase_id_fkey');
--
-- SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--   WHERE table_name = 'profiles' AND column_name = 'expertise';
