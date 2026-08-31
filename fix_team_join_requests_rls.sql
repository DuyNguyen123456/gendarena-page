-- ==============================================================================
-- Migration: Fix Team Join Requests & Invites RLS Policies
-- Allows users to delete and update their own join requests regardless of status
-- (so leaving a team or re-applying does not hit RLS or unique constraint blocks)
-- ==============================================================================

-- 1. Sửa RLS DELETE policy cho team_join_requests: Cho phép user xóa request của chính mình (bất kể pending/accepted/rejected)
DROP POLICY IF EXISTS "Users delete own pending requests" ON public.team_join_requests;
DROP POLICY IF EXISTS "Users delete own requests" ON public.team_join_requests;
CREATE POLICY "Users delete own requests"
  ON public.team_join_requests FOR DELETE
  TO authenticated
  USING (requester_id = auth.uid());

-- 2. Cho phép user cập nhật lại request của chính mình
DROP POLICY IF EXISTS "Users update own requests" ON public.team_join_requests;
CREATE POLICY "Users update own requests"
  ON public.team_join_requests FOR UPDATE
  TO authenticated
  USING (requester_id = auth.uid())
  WITH CHECK (requester_id = auth.uid());

-- 3. Sửa RLS DELETE policy cho team_invites: Cho phép user xóa lời mời của chính mình
DROP POLICY IF EXISTS "Users delete own invites" ON public.team_invites;
CREATE POLICY "Users delete own invites"
  ON public.team_invites FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 4. Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
