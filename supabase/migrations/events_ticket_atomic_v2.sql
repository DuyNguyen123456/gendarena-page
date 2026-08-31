-- ==============================================================================
-- Migration: Atomic Event Ticket Reservation & Capacity Lock (v2)
-- File: supabase/migrations/events_ticket_atomic_v2.sql
-- ==============================================================================

-- 1. Đảm bảo RLS Policy cho phép SELECT count công khai trên bảng event_registrations
-- Giúp anon / public client luôn đọc được số lượng vé chính xác
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view events" ON public.events;
CREATE POLICY "Public can view events"
  ON public.events FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow select registrations" ON public.event_registrations;
CREATE POLICY "Allow select registrations"
  ON public.event_registrations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can register for events" ON public.event_registrations;
CREATE POLICY "Anyone can register for events"
  ON public.event_registrations FOR INSERT
  WITH CHECK (true);

-- 2. Function: Atomic Event Ticket Registration (PostgreSQL RPC)
CREATE OR REPLACE FUNCTION public.register_event_ticket(
  p_event_id UUID,
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_university TEXT DEFAULT NULL,
  p_faculty TEXT DEFAULT NULL,
  p_student_id TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_normalized_email TEXT;
  v_current_count INT;
  v_new_reg_id UUID;
  v_ticket_code TEXT;
BEGIN
  -- 1. Chuẩn hóa & kiểm tra dữ liệu đầu vào
  v_normalized_email := lower(trim(COALESCE(p_email, '')));

  IF p_full_name IS NULL OR trim(p_full_name) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVALID_DATA',
      'message', 'Vui lòng nhập họ và tên đầy đủ.'
    );
  END IF;

  IF v_normalized_email = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVALID_DATA',
      'message', 'Vui lòng nhập địa chỉ email nhận vé.'
    );
  END IF;

  -- 2. LOCK hàng sự kiện (Row-level Lock FOR UPDATE) để đồng bộ hóa các giao dịch đồng thời
  SELECT id, title, is_open, total_tickets
  INTO v_event
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  -- 3. Kiểm tra sự kiện có tồn tại không
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'EVENT_NOT_FOUND',
      'message', 'Sự kiện không tồn tại hoặc đã bị xóa khỏi hệ thống.'
    );
  END IF;

  -- 4. Kiểm tra trạng thái mở/đóng cổng đăng ký
  IF NOT COALESCE(v_event.is_open, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'EVENT_CLOSED',
      'message', 'Sự kiện này hiện đã đóng cổng đăng ký.'
    );
  END IF;

  -- 5. Kiểm tra trùng lặp email cho sự kiện này
  IF EXISTS (
    SELECT 1 FROM public.event_registrations
    WHERE event_id = p_event_id AND lower(trim(email)) = v_normalized_email
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'ALREADY_REGISTERED',
      'message', 'Email này đã đăng ký sự kiện. Mỗi email chỉ đăng ký một lần.'
    );
  END IF;

  -- Kiểm tra trùng lặp tài khoản nếu đã đăng nhập
  IF p_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.event_registrations
    WHERE event_id = p_event_id AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'ALREADY_REGISTERED',
      'message', 'Tài khoản của bạn đã đăng ký tham gia sự kiện này rồi.'
    );
  END IF;

  -- 6. Đếm chính xác số lượng vé đã đăng ký hiện tại trong transaction đang giữ lock
  SELECT count(*)
  INTO v_current_count
  FROM public.event_registrations
  WHERE event_id = p_event_id;

  -- 7. Kiểm tra dung lượng vé (Atomic Check)
  IF v_current_count >= COALESCE(v_event.total_tickets, 0) THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'SOLD_OUT',
      'message', 'Sự kiện đã hết vé tham gia. Hẹn gặp bạn ở các sự kiện tiếp theo!',
      'registered_count', v_current_count,
      'total_tickets', v_event.total_tickets,
      'remaining_tickets', 0
    );
  END IF;

  -- 8. Ghi nhận thông tin đăng ký vé
  INSERT INTO public.event_registrations (
    event_id,
    user_id,
    full_name,
    email,
    phone,
    university,
    faculty,
    student_id
  ) VALUES (
    p_event_id,
    p_user_id,
    trim(p_full_name),
    v_normalized_email,
    NULLIF(trim(p_phone), ''),
    NULLIF(trim(p_university), ''),
    NULLIF(trim(p_faculty), ''),
    NULLIF(trim(p_student_id), '')
  )
  RETURNING id INTO v_new_reg_id;

  -- 9. Sinh mã vé tham dự
  v_ticket_code := 'GEND-EVT-' || upper(substring(replace(v_new_reg_id::text, '-', ''), 1, 8));

  -- 10. Trả về kết quả thành công và thông số vé cập nhật
  RETURN jsonb_build_object(
    'success', true,
    'code', 'SUCCESS',
    'message', 'Đăng ký tham gia sự kiện thành công!',
    'registration_id', v_new_reg_id,
    'ticket_code', v_ticket_code,
    'registered_count', v_current_count + 1,
    'total_tickets', v_event.total_tickets,
    'remaining_tickets', GREATEST(0, v_event.total_tickets - (v_current_count + 1))
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'ALREADY_REGISTERED',
      'message', 'Email này đã đăng ký sự kiện. Mỗi email chỉ đăng ký một lần.'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INTERNAL',
      'message', 'Lỗi xử lý đăng ký vé: ' || SQLERRM
    );
END;
$$;

-- 3. Phân quyền thực thi
GRANT EXECUTE ON FUNCTION public.register_event_ticket(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.register_event_ticket(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_event_ticket(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO anon;
