-- ==============================================================================
-- Migration: Event Registration System (Phase 1)
-- ==============================================================================

-- 1. Bảng events (Quản lý các sự kiện: Webinar, Kick-off, Chung kết...)
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'webinar'
    CHECK (event_type IN ('webinar', 'kickoff', 'finale', 'other')),
  event_date TIMESTAMPTZ,
  location TEXT,
  total_tickets INTEGER NOT NULL DEFAULT 100,
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Bảng event_registrations (Danh sách người tham dự đăng ký sự kiện)
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  university TEXT,
  faculty TEXT,
  student_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_event_registration UNIQUE (event_id, email)
);

-- 3. Indexes tối ưu hiệu năng truy vấn
CREATE INDEX IF NOT EXISTS idx_events_event_date ON public.events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_is_open ON public.events(is_open);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON public.events(event_type);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_email ON public.event_registrations(email);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON public.event_registrations(user_id);

-- 4. Kích hoạt Row Level Security (RLS)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- 5. Policies cho bảng events
-- Mọi người (công khai / khách vãng lai / thí sinh / admin) đều có thể xem danh sách sự kiện
DROP POLICY IF EXISTS "Public can view events" ON public.events;
CREATE POLICY "Public can view events"
  ON public.events FOR SELECT
  USING (true);

-- Chỉ Quản trị viên (Admin) mới có quyền tạo, sửa, xóa sự kiện
DROP POLICY IF EXISTS "Admins have full access to events" ON public.events;
CREATE POLICY "Admins have full access to events"
  ON public.events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. Policies cho bảng event_registrations
-- Cho phép cả anon và authenticated INSERT đăng ký sự kiện
DROP POLICY IF EXISTS "Anyone can register for events" ON public.event_registrations;
CREATE POLICY "Anyone can register for events"
  ON public.event_registrations FOR INSERT
  WITH CHECK (true);

-- Cho phép SELECT để phục vụ kiểm tra trùng lặp và nhận kết quả trả về sau INSERT
DROP POLICY IF EXISTS "Allow select registrations" ON public.event_registrations;
CREATE POLICY "Allow select registrations"
  ON public.event_registrations FOR SELECT
  USING (true);

-- Admin có toàn quyền xem và quản lý danh sách đăng ký
DROP POLICY IF EXISTS "Admins have full access to event registrations" ON public.event_registrations;
CREATE POLICY "Admins have full access to event registrations"
  ON public.event_registrations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

