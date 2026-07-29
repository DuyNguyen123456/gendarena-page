-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: TOPIC CATEGORIES & SINGLE JUDGE ASSIGNMENT CONSTRAINT
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Thêm cột topic với ràng buộc 5 nhóm chủ đề bắt buộc vào bảng submissions
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS topic TEXT CHECK (
    topic IN (
      'Giáo dục',
      'Y tế và Sức khỏe',
      'Kinh doanh, Thương mại và Tài chính',
      'Logistics và Chuỗi cung ứng',
      'Xã hội và Môi trường'
    )
  );

-- 2. Thêm cột topic vào bảng submission_history để lưu vết lịch sử
ALTER TABLE submission_history
  ADD COLUMN IF NOT EXISTS topic TEXT;

-- 3. Dọn dẹp bản ghi phân công trùng lặp (nếu có) trước khi tạo CONSTRAINT UNIQUE
-- (Giữ lại bản ghi phân công mới nhất dựa trên assigned_at)
DELETE FROM judge_assignments a
USING judge_assignments b
WHERE a.submission_id = b.submission_id 
  AND a.assigned_at < b.assigned_at;

-- 4. Thêm ràng buộc UNIQUE cho submission_id trên bảng judge_assignments
-- Đảm bảo 1 bài nộp chỉ được phân công cho TỐI ĐA 1 giám khảo
ALTER TABLE judge_assignments
  DROP CONSTRAINT IF EXISTS judge_assignments_submission_id_key;

ALTER TABLE judge_assignments
  ADD CONSTRAINT judge_assignments_submission_id_key UNIQUE (submission_id);

-- 5. RLS Policies Verification
-- Đảm bảo Judge chỉ đọc được các bài nộp thuộc assignment của mình
DROP POLICY IF EXISTS "Judges view assigned submissions" ON submissions;
CREATE POLICY "Judges view assigned submissions"
ON submissions FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM team_members WHERE team_id = submissions.team_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM judge_assignments WHERE submission_id = submissions.id AND judge_id = auth.uid())
);
