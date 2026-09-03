-- ==============================================================================
-- Migration: Drop Event Registration & Ticketing Feature
-- File: supabase/migrations/drop_events_feature_migration.sql
-- Description: Xoá bỏ hoàn toàn bảng dữ liệu, RPC function, policies liên quan đến
--              tính năng sự kiện (Webinar, Kick-off, Chung kết, Vé QR E-ticket).
-- ==============================================================================

-- 1. Xoá RPC Functions liên quan đến đăng ký vé sự kiện
DROP FUNCTION IF EXISTS public.register_event_ticket(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) CASCADE;

-- 2. Xoá các bảng dữ liệu liên quan (Cascade để tự động drop Foreign Keys & Policies)
DROP TABLE IF EXISTS public.event_registrations CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
