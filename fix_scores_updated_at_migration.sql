-- ═══════════════════════════════════════════════════════════════════
-- GEND ARENA — Fix Scores Missing updated_at Column Migration
-- Safe to re-run (idempotent via IF NOT EXISTS guard).
-- ═══════════════════════════════════════════════════════════════════

-- 1. Add missing updated_at column to public.scores table
ALTER TABLE public.scores
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. Verify column exists
-- SELECT column_name, data_type, column_default 
--   FROM information_schema.columns 
--   WHERE table_name = 'scores' AND column_name = 'updated_at';
