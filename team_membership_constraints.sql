-- ╔══════════════════════════════════════════════════════════════════╗
-- ║                ⚠️  REVIEW BEFORE RUNNING  ⚠️                   ║
-- ║                                                                  ║
-- ║  DATA CLEANUP SCRIPT — CONDITIONAL USE ONLY                     ║
-- ║                                                                  ║
-- ║  This script was written to fix a specific data integrity       ║
-- ║  issue: users belonging to multiple teams simultaneously.       ║
-- ║  It should only be run if that condition is confirmed to exist. ║
-- ║                                                                  ║
-- ║  What this script does:                                         ║
-- ║    1. DELETEs duplicate team_members rows (keeps leader role    ║
-- ║       or newest join if no leader). Logic is CTE-guarded but   ║
-- ║       incorrect data shape may cause unintended deletes.       ║
-- ║    2. ADDs a UNIQUE constraint on team_members(user_id).       ║
-- ║    3. CREATEs a trigger to auto-reject pending join requests.  ║
-- ║                                                                  ║
-- ║  BEFORE RUNNING:                                                 ║
-- ║    1. Verify duplicate team membership actually exists.         ║
-- ║    2. Back up team_members table.                               ║
-- ║    3. Test on staging first.                                    ║
-- ║    4. Review the CTE output before the DELETE executes.        ║
-- ║                                                                  ║
-- ║  Steps 2-3 are safe to re-run (idempotent). Step 1 is not.    ║
-- ║  See audit: SQL_MIGRATIONS_README.md                            ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- 1. DỌN DẸP DỮ LIỆU TRÙNG LẶP HIỆN TẠI (GIỮ LẠI DÒNG MỚI NHẤT HOẶC DÒNG CÓ VAI TRÒ LEADER)
WITH duplicate_members AS (
  SELECT id, user_id, team_id, role, joined_at,
         ROW_NUMBER() OVER (
           PARTITION BY user_id 
           ORDER BY CASE WHEN role = 'leader' THEN 1 ELSE 2 END, joined_at DESC
         ) as rn
  FROM public.team_members
)
DELETE FROM public.team_members
WHERE id IN (
  SELECT id FROM duplicate_members WHERE rn > 1
);

-- 2. THÊM RÀNG BUỘC UNIQUE ĐỂ NGĂN CHẶN USER Ở NHIỀU TEAM TRONG TƯƠNG LAI
ALTER TABLE public.team_members 
  DROP CONSTRAINT IF EXISTS team_members_user_id_unique;

ALTER TABLE public.team_members 
  ADD CONSTRAINT team_members_user_id_unique UNIQUE (user_id);

-- 3. TRIGGER TỰ ĐỘNG REJECT CÁC PENDING REQUESTS VÀ INVITES KHÁC KHI USER ĐÃ VÀO 1 TEAM
CREATE OR REPLACE FUNCTION public.handle_new_team_membership()
RETURNS TRIGGER AS $$
BEGIN
  -- Cập nhật tất cả team_join_requests đang chờ của user này thành 'rejected'
  UPDATE public.team_join_requests
  SET status = 'rejected', responded_at = now(), responded_by = NEW.user_id
  WHERE requester_id = NEW.user_id 
    AND status = 'pending';

  -- Cập nhật tất cả team_invites đang chờ của user này thành 'rejected'
  UPDATE public.team_invites
  SET status = 'rejected', responded_at = now()
  WHERE invited_uid = (SELECT uid FROM public.profiles WHERE id = NEW.user_id) 
    AND status = 'pending';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gỡ bỏ trigger cũ nếu tồn tại để tránh xung đột
DROP TRIGGER IF EXISTS trigger_on_new_team_membership ON public.team_members;

-- Tạo trigger chạy AFTER INSERT trên bảng team_members
CREATE TRIGGER trigger_on_new_team_membership
  AFTER INSERT ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_team_membership();
