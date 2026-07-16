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
