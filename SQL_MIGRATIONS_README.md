# SQL Migrations — GenD Arena 2026

> **Tài liệu này dành cho bất kỳ ai cần chạy hoặc hiểu các file SQL trong repo.**
> Đọc tài liệu này trước khi mở bất kỳ file `.sql` nào.

---

## ⚠️ Nguyên Tắc An Toàn — Đọc Trước Khi Làm Bất Cứ Gì

1. **Không chạy SQL bừa bãi trên production** — một số file chứa lệnh `DELETE` không có điều kiện.
2. **Luôn backup trước** — dù file có vẻ idempotent, hãy backup DB trước khi áp dụng bất kỳ migration nào lên production.
3. **Đối chiếu DB thật trên Supabase** — trước khi cleanup hay reorganize, kiểm tra schema thực tế đã có những gì, tránh apply trùng hoặc thiếu.
4. **Chạy đúng thứ tự** — một số file phụ thuộc vào file khác (xem mục "Thứ tự chạy" bên dưới).
5. **Test trên staging trước** khi áp dụng lên production.

---

## Inventory — 10 Files SQL Hiện Có ở Root Repo

| File | Lines | Idempotent? | Phân loại |
|------|-------|-------------|-----------|
| `schema_update.sql` | 218 | NO | ONE-SHOT BOOTSTRAP |
| `gendarena_update_2.sql` | 412 | YES | Core Migration |
| `gendarena_update_3.sql` | 260 | YES | Core Migration |
| `assignments_and_topic_migration.sql` | ~60 | YES | Patch |
| `fix_dataflow_and_expertise_migration.sql` | ~70 | YES | Patch |
| `fix_gating_and_assignment_migration.sql` | ~100 | YES | Patch |
| `fix_scores_updated_at_migration.sql` | ~20 | YES | Patch |
| `speakers_sync_migration.sql` | 22 | YES | Patch |
| `submissions_rls_migration.sql` | 107 | YES | Patch |
| `team_membership_constraints.sql` | 49 | PARTIAL | Conditional Cleanup |

---

## ONE-SHOT BOOTSTRAP — KHONG DUOC RERUN

### schema_update.sql

**Muc dich**: Tao bootstrap schema ban dau + seed data cho competition phases.

**Tai sao nguy hiem**:
File nay chua 3 lenh DELETE KHONG CO WHERE:

    DELETE FROM submission_history;   -- xoa TOAN BO
    DELETE FROM submissions;          -- xoa TOAN BO
    DELETE FROM competition_phases;   -- xoa TOAN BO

Chi chay file nay mot lan duy nhat tren DB trong truoc khi co bat ky data nao.
**Rerun tren production = mat toan bo submissions va phase data.**

---

## Core Migrations — Chay Theo Thu Tu

### gendarena_update_2.sql

La migration quan trong nhat trong he thong judge/scoring. Phai chay TRUOC update_3.

Thiet lap:
- Security helper functions: is_admin(), is_judge(), auth_user_role()
- Profile extensions: facebook_url, avatar_url
- Bang scoring_config + trigger validate tong trong so = 100
- Bang judge_assignments + indexes + RLS
- Bang scores + trigger compute_weighted_score
- View leaderboard_view + function get_leaderboard()
- Storage bucket avatars + upload/delete policies

### gendarena_update_3.sql

**Phu thuoc cung vao update_2** — se fail neu chay truoc.

Mo rong:
- Profile RLS day du (admin + self select/update/insert)
- Bang scoring_rounds, scoring_criteria, score_levels (dynamic scoring)
- Override compute_weighted_score() de ho tro dynamic criteria
- Override enforce_score_business_rules() de kiem tra scoring_open per round
- RLS cho toan bo cac bang dynamic scoring moi

---

## Patch / Incremental — An Toan, Idempotent

Cac file duoi day co the chay doc lap va chay lai nhieu lan ma khong gay tac dung phu.

| File | Noi dung |
|------|---------|
| assignments_and_topic_migration.sql | Them cot topic vao submissions; unique constraint cho judge_assignments |
| fix_dataflow_and_expertise_migration.sql | Don orphaned records; them cot expertise vao profiles; FK constraints |
| fix_gating_and_assignment_migration.sql | Them scoring_open, passing_score, max_teams vao competition_phases; trigger set_phase_status_from_dates |
| fix_scores_updated_at_migration.sql | Them cot updated_at vao bang scores |
| speakers_sync_migration.sql | Them organization, linkedin_url, category vao bang speakers (sync schema voi codebase, 2026-07-03) |
| submissions_rls_migration.sql | Reset va tao lai toan bo RLS cho submissions va scores (hotfix) |

---

## Conditional Cleanup — Chi Chay Khi Can

### team_membership_constraints.sql

**Muc dich**: Don duplicate team membership + them UNIQUE constraint.

**Khi nao can chay**:
Chi chay neu xac nhan co user dang thuoc nhieu team cung luc (vi pham business rule).

**Luu y**:
- Buoc 1 (DELETE duplicate) KHONG idempotent — chi nen chay 1 lan khi co van de.
- Buoc 2-3 (ADD CONSTRAINT + CREATE TRIGGER) la idempotent.
- Backup team_members truoc khi chay.

---

## Thu Tu Chay Neu Can Reset DB Tu Dau

> Chi ap dung khi setup DB moi hoan toan. Khong chay tuan tu nay tren DB dang co data.

    1.  schema_update.sql                         <- ONE-SHOT: chi chay tren DB trong
    2.  gendarena_update_2.sql                    <- Core: security, scoring, judge, storage
    3.  gendarena_update_3.sql                    <- Core: dynamic scoring, expanded RLS
    4.  assignments_and_topic_migration.sql       <- Patch: topic column + unique constraint
    5.  fix_dataflow_and_expertise_migration.sql  <- Patch: FK + expertise column
    6.  fix_gating_and_assignment_migration.sql   <- Patch: phase gating columns + triggers
    7.  fix_scores_updated_at_migration.sql       <- Patch: updated_at column
    8.  speakers_sync_migration.sql               <- Patch: speakers schema sync
    9.  submissions_rls_migration.sql             <- Patch: submissions/scores RLS
    10. team_membership_constraints.sql           <- Conditional: chi neu co duplicate data

---

## Checklist Truoc Khi Chay Bat Ky SQL Nao

- [ ] Da backup DB (hoac xac nhan day la moi truong staging/dev khong co data quan trong)
- [ ] Da doc noi dung file — dac biet kiem tra DELETE, DROP TABLE, TRUNCATE
- [ ] Da kiem tra file co phan loai One-Shot hay Conditional khong
- [ ] Da doi chieu schema thuc te tren Supabase Dashboard
- [ ] Da chay thu tren staging neu co

---

## Goi Y Cleanup Tuong Lai

### Huong A — Tich hop Supabase CLI (Khuyen nghi dai han)
Di chuyen cac file vao supabase/migrations/ voi prefix timestamp theo chuan Supabase CLI.
Loi ich: CLI tu track migration state, tranh apply trung.
Luu y: Can convert schema_update.sql de loai bo lenh DELETE bare truoc khi dua vao managed migrations.

### Huong B — Archive vao sql/archive/ (Don gian hon)
Tao thu muc sql/archive/ va di chuyen cac file vao do sau khi da xac nhan apply.

### Khong nen lam
- Khong xoa bat ky file SQL nao cho den khi xac nhan 100% da apply len production.
- Khong merge cac file truoc khi hieu ro trang thai DB hien tai.
- Khong reorganize ma khong kiem tra schema thuc te tren Supabase Dashboard truoc.

---

## Kiem Tra Schema Thuc Te Tren Supabase

Chay query sau trong Supabase SQL Editor de xem cac bang dang ton tai:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Kiem tra columns cua mot bang cu the:
```sql
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'scores'
ORDER BY ordinal_position;
```

Kiem tra RLS policies hien tai:
```sql
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

*Tai lieu nay duoc tao sau SQL migration audit — GenD Arena 2026, 2026-08-06.*
*Khong phan anh trang thai DB thuc te — chi phan anh noi dung cac file SQL trong repo.*
