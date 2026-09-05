-- ==============================================================================
-- MIGRATION: THÊM TÍNH NĂNG THÀNH TÍCH, CÔNG KHAI HỒ SƠ & GHÉP ĐỘI THÍ SINH
-- ==============================================================================
-- 1. Bổ sung trường 'achievements' (thành tích, giải thưởng, kỹ năng nổi bật)
-- 2. Bổ sung cờ 'is_profile_public' (bật/tắt chế độ công khai tìm đội, MẶC ĐỊNH FALSE)
-- 3. Bổ sung cấu hình 'public_fields' (JSONB lựa chọn các trường được phép công khai)
-- 4. Tạo Index hỗ trợ tìm kiếm thí sinh đang mở ghép đội
-- ==============================================================================

BEGIN;

-- 1. Thêm cột 'achievements'
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS achievements TEXT;

-- 2. Thêm cột 'is_profile_public' (Mặc định là FALSE - tắt công khai cho toàn bộ thí sinh hiện có và mới)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_profile_public BOOLEAN NOT NULL DEFAULT false;

-- 3. Thêm cột 'public_fields' với cấu hình JSONB an toàn mặc định
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS public_fields JSONB NOT NULL DEFAULT '{
    "phone": false,
    "email": false,
    "facebook_url": true,
    "university": true,
    "faculty": true,
    "major": true,
    "achievements": true
  }'::jsonb;

-- 4. Đảm bảo toàn bộ tài khoản hiện tại đều có is_profile_public = false nếu giá trị đang null
UPDATE public.profiles
SET is_profile_public = false
WHERE is_profile_public IS NULL;

-- 5. Tạo Index tối ưu hóa truy vấn các thí sinh đang bật tìm đội
CREATE INDEX IF NOT EXISTS idx_profiles_public_teaming
  ON public.profiles(is_profile_public)
  WHERE is_profile_public = true;

COMMIT;

-- 6. Reload schema cache cho PostgREST
NOTIFY pgrst, 'reload schema';
