-- ==============================================================================
-- Migration: Team Payment & Verification System (Phase 1)
-- ==============================================================================

-- 1. Thêm các cột quản lý lệ phí và xác thực vào bảng teams
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'locked_pending_payment', 'verified', 'payment_rejected')),
  ADD COLUMN IF NOT EXISTS payment_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_rejected_reason TEXT;

-- 2. Đánh Index cho cột status để tối ưu truy vấn Admin
CREATE INDEX IF NOT EXISTS idx_teams_payment_status ON public.teams(status);
CREATE INDEX IF NOT EXISTS idx_teams_payment_submitted ON public.teams(payment_submitted_at);

-- 3. Tạo Supabase Storage bucket 'payment-receipts' nếu chưa tồn tại
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-receipts',
  'payment-receipts',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

-- 4. Policies cho Storage bucket 'payment-receipts'
-- Cho phép bất kỳ ai (public) xem ảnh biên lai
DROP POLICY IF EXISTS "Public view payment receipts" ON storage.objects;
CREATE POLICY "Public view payment receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-receipts');

-- Cho phép người dùng đã xác thực tải ảnh biên lai lên
DROP POLICY IF EXISTS "Authenticated upload payment receipts" ON storage.objects;
CREATE POLICY "Authenticated upload payment receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'payment-receipts');

-- Cho phép người tải ảnh cập nhật/thay thế biên lai của họ
DROP POLICY IF EXISTS "Authenticated update payment receipts" ON storage.objects;
CREATE POLICY "Authenticated update payment receipts"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'payment-receipts');

-- 5. Cập nhật RLS Policy cho bảng teams (đảm bảo Admin có quyền UPDATE status của tất cả đội)
DROP POLICY IF EXISTS "Admins can update all teams" ON public.teams;
CREATE POLICY "Admins can update all teams"
  ON public.teams FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
