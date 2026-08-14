# Big UI Update — Phase Roadmap

> **Project:** GenD Arena 2026  
> **Rollback point:** git tag `pre-big-update`  
> **Design guide:** [`DESIGN.md`](../DESIGN.md)  
> **Token source:** [`design/tokens.ts`](../design/tokens.ts)

## Status: In Progress

| Phase | Scope | Status | Branch | Commit |
|-------|-------|--------|--------|--------|
| U0 | Design foundation (tokens, DESIGN.md, fonts, Tailwind @theme) | ✅ Done | `main` | - |
| U1 | Atomic components (Button, Input, Card, Modal, Badge) | ⏳ Pending | - | - |
| U2 | Shared layout (Navbar, Footer, Loading states) | ⏳ Pending | - | - |
| U3 | Landing page redesign | ⏳ Pending | - | - |
| U4 | Auth pages (login, register, reset-password) | ⏳ Pending | - | - |
| U5 | Participant flow (dashboard, team, submissions, profile) | ⏳ Pending | - | - |
| U6 | Judge dashboard + scoring UI | ⏳ Pending | - | - |
| U7 | Admin panel (users, competitions, phases, submissions, assign, scoring, leaderboard, speakers, sponsors) | ⏳ Pending | - | - |
| U8 | Polish (motion, empty states, error states, 404) | ⏳ Pending | - | - |

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

### U6 — Judge Dashboard ⏳
**Scope:** Scoring UI, submission review, judge panel
**Prerequisites:** U1 ✅, U2 ✅

---

### U7 — Admin Panel ⏳
**Scope:** Users, competitions, phases, submissions, assignment, scoring, leaderboard, speakers, sponsors
**Prerequisites:** U1 ✅, U2 ✅

---

### U8 — Polish ⏳
**Scope:** Motion refinement, empty states, error states, 404/500 pages, `prefers-reduced-motion`
**Prerequisites:** U3–U7 ✅

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
