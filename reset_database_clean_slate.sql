-- ==============================================================================
-- RESET TOÀN BỘ TÀI KHOẢN & DỮ LIỆU DATABASE — GEND ARENA 2026
-- ==============================================================================
-- Lưu ý: Supabase bảo vệ bảng storage.objects bằng trigger riêng.
-- 1. Bạn chạy đoạn SQL dưới đây để reset toàn bộ dữ liệu bảng quan hệ.
-- 2. Đối với file Storage: Vào mục Storage trên Supabase Dashboard -> bấm Empty Bucket.
-- ==============================================================================

BEGIN;

-- 1. XÓA DỮ LIỆU ĐIỂM SỐ & PHÂN CÔNG CHẤM
DELETE FROM public.scores;
DELETE FROM public.judge_assignments;

-- 2. XÓA TOÀN BỘ BÀI NỘP & LỊCH SỬ NỘP ĐỀ ÁN
DELETE FROM public.submission_history;
DELETE FROM public.submissions;

-- 3. XÓA THÔNG BÁO & ĐĂNG KÝ SỰ KIỆN
DELETE FROM public.notifications;
DELETE FROM public.event_registrations;

-- 4. XÓA TOÀN BỘ ĐỘI THI, THÀNH VIÊN & YÊU CẦU GIA NHẬP
DELETE FROM public.team_join_requests;
DELETE FROM public.team_members;
DELETE FROM public.teams;

-- 5. XÓA TOÀN BỘ HỒ SƠ PROFILES (KỂ CẢ TÀI KHOẢN ADMIN CŨ)
DELETE FROM public.profiles;

-- 6. XÓA TOÀN BỘ TÀI KHOẢN ĐĂNG NHẬP TRONG AUTH.USERS
DELETE FROM auth.users;

COMMIT;

-- 7. RELOAD SCHEMA CACHE CHO POSTGREST
NOTIFY pgrst, 'reload schema';

-- 8. KIỂM TRA LẠI TRẠNG THÁI SAU KHI DỌN SẠCH
SELECT 'Tài khoản người dùng (auth.users)' AS danh_muc, COUNT(*) AS so_luong FROM auth.users
UNION ALL
SELECT 'Hồ sơ người dùng (profiles)' AS danh_muc, COUNT(*) AS so_luong FROM public.profiles
UNION ALL
SELECT 'Đội thi (teams)' AS danh_muc, COUNT(*) AS so_luong FROM public.teams
UNION ALL
SELECT 'Bài nộp (submissions)' AS danh_muc, COUNT(*) AS so_luong FROM public.submissions
UNION ALL
SELECT 'Vòng thi còn giữ nguyên (competition_phases)' AS danh_muc, COUNT(*) AS so_luong FROM public.competition_phases
UNION ALL
SELECT 'Diễn giả còn giữ nguyên (speakers)' AS danh_muc, COUNT(*) AS so_luong FROM public.speakers;
