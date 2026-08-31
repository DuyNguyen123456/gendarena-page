-- ==============================================================================
-- Migration: Add Payment Columns to Teams Table & Setup Storage
-- ==============================================================================

-- 1. Thêm các cột quản lý lệ phí và xác thực vào bảng teams nếu chưa tồn tại
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS payment_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_rejected_reason TEXT;

-- 2. Đảm bảo trạng thái status có CHECK constraint hợp lệ (an toàn khi re-run)
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_status_check;
ALTER TABLE public.teams ADD CONSTRAINT teams_status_check 
  CHECK (status IN ('draft', 'locked_pending_payment', 'verified', 'payment_rejected'));

-- 3. Đánh Index cho cột status và payment_submitted_at để tối ưu truy vấn Admin
CREATE INDEX IF NOT EXISTS idx_teams_payment_status ON public.teams(status);
CREATE INDEX IF NOT EXISTS idx_teams_payment_submitted ON public.teams(payment_submitted_at);

-- 4. Tạo Supabase Storage bucket 'payment-receipts' với giới hạn 2MB (2,097,152 bytes)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-receipts',
  'payment-receipts',
  true,
  2097152, -- 2MB (2,097,152 bytes)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

UPDATE storage.buckets
SET public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
WHERE id = 'payment-receipts';

-- 5. Policies cho Storage bucket 'payment-receipts'
DROP POLICY IF EXISTS "Public view payment receipts" ON storage.objects;
CREATE POLICY "Public view payment receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-receipts');

DROP POLICY IF EXISTS "Authenticated upload payment receipts" ON storage.objects;
CREATE POLICY "Authenticated upload payment receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'payment-receipts');

DROP POLICY IF EXISTS "Authenticated update payment receipts" ON storage.objects;
CREATE POLICY "Authenticated update payment receipts"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'payment-receipts')
  WITH CHECK (bucket_id = 'payment-receipts');

DROP POLICY IF EXISTS "Authenticated delete payment receipts" ON storage.objects;
CREATE POLICY "Authenticated delete payment receipts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'payment-receipts');

-- 6. Cập nhật RLS Policy cho bảng teams (Admin có quyền duyệt thanh toán)
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

-- 7. QUAN TRỌNG: Reload PostgREST Schema Cache để Supabase nhận diện cột mới ngay lập tức
NOTIFY pgrst, 'reload schema';
