-- Migration: Add profile completion fields to profiles table
-- Additive only: adds university, faculty, major, phone, and dob columns if not present

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS university TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS faculty TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS major TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dob DATE;
