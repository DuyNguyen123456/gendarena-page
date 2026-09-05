-- ==========================================================
-- Migration: Sửa lỗi RLS DELETE trên bảng public.team_invites
-- Mục đích: Cho phép Trưởng đội (invited_by) có quyền xóa/thu hồi lời mời của chính mình
-- ==========================================================

-- 1. Bỏ policy cũ (nếu có kiểm tra sai tên cột user_id)
DROP POLICY IF EXISTS "Users delete own invites" ON public.team_invites;
DROP POLICY IF EXISTS "Leaders delete own invites" ON public.team_invites;

-- 2. Tạo policy chuẩn xác cho phép người gửi lời mời (invited_by) hoặc Trưởng đội xóa lời mời
CREATE POLICY "Leaders delete own invites"
  ON public.team_invites FOR DELETE
  TO authenticated
  USING (
    invited_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_invites.team_id
        AND leader_id = auth.uid()
    )
  );

-- 3. Reload PostgREST Cache
NOTIFY pgrst, 'reload schema';
