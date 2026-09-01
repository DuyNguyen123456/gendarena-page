-- ═══════════════════════════════════════════════════════════════════
-- GEND ARENA - FIX SUBMISSIONS STORAGE BUCKET (TRIỆT ĐỂ 100%)
-- ═══════════════════════════════════════════════════════════════════
-- Mục đích:
-- Khắc phục triệt để lỗi khi nộp bài:
--   "Upload file Pitch-deck thất bại: mime type application/vnd.openxmlformats-officedocument.presentationml.presentation is not supported"
--
-- Nguyên nhân:
-- Bucket 'submissions' trong bảng `storage.buckets` của Supabase đang bị giới hạn cột `allowed_mime_types`.
-- Khi upload PowerPoint (.pptx, .ppt), Word (.docx, .doc), hoặc khi trình duyệt/hệ điều hành
-- gửi các MIME type khác nhau, Supabase Storage API sẽ trả về lỗi HTTP 400 Bad Request.
--
-- Giải pháp triệt để:
-- 1. Đặt `allowed_mime_types = NULL` cho bucket 'submissions' trong `storage.buckets`.
--    (Trong Supabase Storage, `NULL` đồng nghĩa với việc cho phép tất cả các loại MIME type hợp lệ,
--    không bị chặn máy móc ở tầng Storage API. Định dạng tài liệu .pdf, .pptx, .ppt, .docx, .doc
--    và dung lượng 10MB đã được kiểm tra & bảo vệ chặt chẽ ở tầng Application).
-- 2. Đặt `file_size_limit = 52428800` (50MB) trên bucket Supabase để đảm bảo không bị lỗi cận biên.
-- 3. Tạo đầy đủ Storage Policies (SELECT, INSERT, UPDATE, DELETE) cho authenticated users.
-- 4. Trả về thông tin bucket sau khi cập nhật để bạn kiểm tra ngay lập tức.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Khởi tạo hoặc cập nhật bucket 'submissions' trong storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submissions',
  'submissions',
  false,
  52428800, -- 50MB (50 * 1024 * 1024 bytes)
  NULL      -- NULL = Không giới hạn MIME type ở server Supabase, tránh chặn nhầm định dạng
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = NULL;

-- Cập nhật trực tiếp nếu bucket đã tồn tại từ trước
UPDATE storage.buckets
SET public = false,
    file_size_limit = 52428800,
    allowed_mime_types = NULL
WHERE id = 'submissions';

-- 2. Đảm bảo Storage Policies cho bucket 'submissions' hoạt động chuẩn xác cho người dùng đã đăng nhập
DROP POLICY IF EXISTS "submissions_authenticated_select" ON storage.objects;
CREATE POLICY "submissions_authenticated_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'submissions');

DROP POLICY IF EXISTS "submissions_authenticated_insert" ON storage.objects;
CREATE POLICY "submissions_authenticated_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'submissions');

DROP POLICY IF EXISTS "submissions_authenticated_update" ON storage.objects;
CREATE POLICY "submissions_authenticated_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'submissions')
  WITH CHECK (bucket_id = 'submissions');

DROP POLICY IF EXISTS "submissions_authenticated_delete" ON storage.objects;
CREATE POLICY "submissions_authenticated_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'submissions');

-- 3. Kiểm tra kết quả cấu hình bucket 'submissions' (Chạy xong sẽ thấy allowed_mime_types: null)
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'submissions';
