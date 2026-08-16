# Big UI Update — Phase Roadmap

> **Project:** GenD Arena 2026  
> **Rollback point:** git tag `pre-big-update`  
> **Design guide:** [`DESIGN.md`](../DESIGN.md)  
> **Token source:** [`design/tokens.ts`](../design/tokens.ts)

## Status: In Progress

| Phase | Scope | Status | Branch | Commit |
|-------|-------|--------|--------|--------|
| U0 | Design foundation (tokens, DESIGN.md, fonts, Tailwind @theme) | ✅ Done | `main` | - |
| U1 | Atomic components (Button, Input, Card, Modal, Badge) | ✅ Done | `main` | - |
| U2 | Shared layout (Navbar, Footer, Loading states) | ✅ Done | `main` | - |
| U3 | Landing page redesign | ✅ Done | `main` | - |
| U4 | Auth pages (login, register, reset-password) | ⏳ Pending | - | - |
| U5 | Participant flow (dashboard, team, submissions, profile) | ⏳ Pending | - | - |
| U6 | Judge dashboard + scoring UI | ✅ Done | `main` | - |
| U7a | Admin Core & Entity Mgmt (Hub, Users, Competitions, Speakers, Sponsors) | ✅ Done | `main` | - |
| U7b | Admin Timeline & Scoring Config (Phases, Scoring Rounds & Criteria) | ✅ Done | `main` | - |
| U7c | Admin Submissions, Assign & Leaderboard | ✅ Done | `main` | - |
| U8 | Polish (motion, empty states, error states, 404) | ✅ Done | `main` | - |

---

## Phase Details

### U0 — Design Foundation ✅
**Deliverables:**
- `design/tokens.ts` — TypeScript design tokens (`as const`, full literal types)
- `DESIGN.md` — Style guide, component patterns, anti-slop rules, references
- `app/layout.tsx` — 3 fonts via `next/font/google` with `vietnamese` subset
- `app/globals.css` — `@theme` block exposing all tokens as Tailwind v4 utilities

**Font setup:**
- Inter (`--font-inter`) → `font-display` class
- Be Vietnam Pro (`--font-be-vietnam-pro`) → `font-body` class (default body)
- JetBrains Mono (`--font-jetbrains-mono`) → `font-mono` class

**New Tailwind classes available (not yet applied):**
- Colors: `bg-surface-base`, `bg-surface-raised`, `text-brand-cyan`, `border-surface-border`, etc.
- Radius: `rounded-sm` (6px) `rounded-md` (10px) `rounded-lg` (14px) `rounded-xl` (20px)
- Shadows: `shadow-elevation-1/2/3`, `shadow-glow`

---

### U1 — Atomic Components ⏳
**Scope:** New design system components (không replace, thêm vào `components/ui/`)
- `Button` — variants: primary/secondary/ghost, sizes: sm/md/lg, props: isLoading/leftIcon/rightIcon
- `Input` — focus ring cyan, error state, consistent height
- `Card` — hover elevation, border brighten
- `Modal` — backdrop-blur overlay, enter/exit animation
- `Badge` — pill variants, semantic colors

**Prerequisites:** U0 ✅

---

### U2 — Shared Layout ⏳
**Scope:** Navbar, Footer, Loading skeleton, PageWrapper
**Prerequisites:** U1 ✅

---

### U3 — Landing Page Redesign ⏳
**Scope:** Hero, features, timeline, sponsors, CTA sections
**Prerequisites:** U1 ✅, U2 ✅

---

### U4 — Auth Pages ⏳
**Scope:** `/login`, `/register`, `/reset-password`
**Prerequisites:** U1 ✅

---

### U5 — Participant Flow ⏳
**Scope:** `/dashboard`, `/team`, `/submissions`, `/profile`
**Prerequisites:** U1 ✅, U2 ✅

---

### U6 — Judge Dashboard ✅
**Scope:** Scoring UI, submission review, judge panel
**Prerequisites:** U1 ✅, U2 ✅

**Deliverables:**
- `app/judge/page.tsx` — Page header with BGK badge, Card-based status/expertise/rubric layout, design token colors, Button/Badge components
- `app/judge/scoring/page.tsx` — Scoring list with semantic alert, accessible form inputs, submission status badges, proper empty/loading states

---

### U7a — Admin Core & Entity Management ✅
**Scope:** Hub (`/admin`), Users (`/admin/users`), Competitions (`/admin/competitions`), Speakers (`/admin/speakers`), Sponsors (`/admin/sponsors`)
**Prerequisites:** U1 ✅, U2 ✅

**Deliverables:**
- `app/admin/page.tsx` — Admin Hub dashboard with responsive stats cards, quick navigation grid, BTC badge, and tokenized layout
- `app/admin/users/page.tsx` — Users table with search, role badges, ExpertiseEditorModal with topic checkboxes
- `app/admin/competitions/page.tsx` — Competitions list with status badges, CRUD card form, formatted display dates
- `app/admin/speakers/page.tsx` — Speakers management with avatar preview cards, category badges, CRUD form
- `app/admin/sponsors/page.tsx` — Sponsors & partners management with logo preview, tier badges, CRUD form

---

### U7b — Competition Timeline & Scoring Configuration ✅
**Scope:** Phases (`/admin/phases`), Scoring Config (`/admin/scoring`)
**Prerequisites:** U7a ✅

**Deliverables:**
- `app/admin/phases/page.tsx` — Timeline & gating management with accessible switch controls, formatted dates, status badges, and 13-field modal form
- `app/admin/scoring/page.tsx` — Scoring rounds & criteria manager with weight sum validation, rubric URL preview, criteria list, and quick assignment widget

---

### U7c — Submissions, Judge Assignment & Leaderboard ✅
**Scope:** Submissions (`/admin/submissions`), Assign (`/admin/assign`), Leaderboard (`/admin/leaderboard`)
**Prerequisites:** U7b ✅

**Deliverables:**
- `app/admin/submissions/page.tsx` — Card-based submission list with tab-bar filter (All, Pending, by Phase), status badges, topic badges, judge assignment indicator, role-gated views (Admin vs Judge)
- `app/admin/assign/page.tsx` — Assignment panel with topic filter chips, judge expertise match indicator, Card-based dual-panel (current judge + reassign select), `removeAssignment` 2-param signature preserved
- `app/admin/leaderboard/page.tsx` — Animated progress-bar rankings, Trophy/Medal Lucide icons, accessible `role="list"` markup, `getLeaderboard` RPC frozen

### U8 — Polish ✅
**Scope:** Motion refinement, empty states, error states, 404 page, Dialog migration, anti-slop visual cleanup
**Prerequisites:** U3–U7 ✅

**Deliverables:**
- `app/team/dashboard/page.tsx` — P0: Replaced bare `null` render with semantic error alert and return navigation button
- `app/admin/competitions/page.tsx` — P0/P1: Replaced `window.confirm()` with shared `Dialog`, added entity empty state
- `app/admin/phases/page.tsx` — P0/P1/P2: Replaced `window.confirm()` with shared `Dialog`, added error fallback with retry, upgraded empty state
- `app/admin/speakers/page.tsx` — P0/P1: Replaced `window.confirm()` with shared `Dialog`, upgraded empty state
- `app/admin/sponsors/page.tsx` — P0/P1: Replaced `window.confirm()` with shared `Dialog`, upgraded empty state with Building2 icon
- `app/admin/users/page.tsx` — P1: Polished empty state with design tokens
- `app/admin/submissions/page.tsx` — P1: Added error state and retry fallback
- `app/admin/leaderboard/page.tsx` — P1: Added error state and retry fallback
- `app/team/browse/page.tsx` — P1: Added error state banner when fetching open teams fails
- `app/not-found.tsx` — P1: Full migration to design system surface tokens, Button components, SearchX icon, removed all legacy classes
- `app/privacy-policy/page.tsx` — P2: Full visual refactor with Card and token typography, preserved all 9 sections and contact data
- `app/competitions/[id]/CompetitionDetailView.tsx` — P2: Migrated to design system tokens, Card, Badge, and Button, preserved all logic
- `app/organizers/OrganizersView.tsx` — P2: Refactored with design system tokens and Card layout, removed legacy classes
- `app/admin/scoring/page.tsx` — P2: Upgraded criteria empty state with Scale icon + text

---

## Rules

> **These rules are mandatory for all phases U1–U8.**

- **1 phase = 1 branch = 1 PR** — không merge nhiều phases vào 1 PR
- **Manual test pass trước khi merge** — mở trang, check DevTools, không có console error
- **Git tag `pre-big-update` là rollback point** — nếu cần rollback: `git checkout pre-big-update`
- **Business logic freeze** — không đụng vào `services/`, `lib/supabase/`, database schema, RLS policies trong bất kỳ phase nào
- **No new dependencies** — dùng những gì đã có (CVA, clsx, lucide-react, radix-ui, shadcn)
- **TypeScript strict** — không dùng `any`, không ignore TS errors
- **Backward compat** — existing pages phải render đúng trong mọi phase

## Rollback Command

```bash
git checkout pre-big-update
```
