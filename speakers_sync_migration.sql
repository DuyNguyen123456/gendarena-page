-- ═══════════════════════════════════════════════════════════════════
-- SPEAKERS TABLE — SCHEMA SYNC MIGRATION
-- Date: 2026-07-03
-- Purpose: Sync DB schema with codebase. Adds 3 missing columns.
-- Safe to run multiple times (IF NOT EXISTS guards).
-- Does NOT drop any existing columns or weaken RLS policies.
-- ═══════════════════════════════════════════════════════════════════

alter table public.speakers
  add column if not exists organization  text,
  add column if not exists linkedin_url  text,
  add column if not exists category      text not null default 'speaker'
                                         check (category in ('speaker', 'judge', 'mentor'));

-- ═══════════════════════════════════════════════════════════════════
-- VERIFICATION: Run this SELECT after migration to confirm columns exist
-- ═══════════════════════════════════════════════════════════════════
-- select column_name, data_type, column_default, is_nullable
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'speakers'
-- order by ordinal_position;
