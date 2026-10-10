# DevHabit web — Roadmap

The frontend's plan, status and design decisions. The backend's plan is in the backend repo
(`habit-tracker/docs/ROADMAP.md`); its dev log only notes that frontend work happened and what it
needed from the API. Update this file in the same PR that finishes a step.

**Legend:** ✅ done · 🔄 in progress · ⬜ not started · ⏸ waiting on the backend

**Branch flow:** one step per branch, taken from `staging` (or the previous step's branch), PR into
`staging`. Claude commits and pushes and gives PR links; Nayeem opens and merges.

## Where we are (2026-10-06)

**Phase G is done** (G.0–G.3), and so is everything the backend offers so far: **M2 goals, M3
resources (notes, links, files), M4 levels and M5 dashboard**. Left: M6 AI insights and Google
sign-in, both waiting on the backend.
The text below is how it stood before Phase G.

F.1–F.6 are merged: sign in / register, habits (create, edit, archive), Today with one-tap
check-in, habit detail (streaks, 7/30-day stats, history), notification bell. It works, but it
looks like a first draft — **function came first, the visual design never got its own pass**, and
there is no dashboard. Two separate reasons the app feels thin:

1. **Missing product**: the backend has no goals, resources, levels, dashboard summary or AI yet
   (M2–M6), so there is nothing to build screens for.
2. **Missing design**: even the screens that exist are plain lists. This is ours to fix now,
   without waiting for the backend.

## Done — Phase F (first build)

| # | Step | Status |
|---|---|---|
| F.1 | Scaffold: Vite + TS + Tailwind + router + TanStack Query, dev proxy, API client with silent refresh | ✅ |
| F.2 | Sign in / register, protected routes, sign out | ✅ |
| F.3 | Habit list, create / edit, archive | ✅ |
| F.4 | Today view — one-tap check-in, streaks | ✅ |
| F.5 | Habit detail — streaks, 7/30-day stats, history | ✅ |
| F.6 | Notification bell — unread count, list, mark read | ✅ |

## Next — Phase G: test, design, dashboard (works with today's API)

| # | Step | Status |
|---|---|---|
| G.0 | **Test pass** against the live backend: register → habits → check-ins → detail → bell, at phone and desktop width. Fix what it finds. | ✅ |
| G.1 | **Design pass**: soft surfaces, tactile check-ins, progress banner, empty/loading states, phone nav, dark mode that follows the system (PRs #10–#14). | ✅ |
| G.2 | **Dashboard v1** (`/`, the home page; Today moved to `/today`): today's progress, longest current streaks, 7/30-day completion across habits, a 12-week activity grid. Built from existing endpoints (PR #15). | ✅ |
| G.3 | **Habit detail, visual**: 26-week calendar heatmap, current streak as a bar against the best, 7/30-day completion as rings, days-per-week bars against the weekly goal. | ✅ |

Notes on G.2: per-habit calls are N+1 and fine for a handful of habits, not for dozens. If it feels
slow, ask the backend for one summary endpoint (that is the backend's M5 dashboard) instead of
adding client-side cleverness. Record the ask in the backend dev log when it is made.

## Now — Phase M2: goals (backend M2 is done)

| # | Step | Status |
|---|---|---|
| M2.1 | **Goals list and form**: `/goals` with Active / Achieved / Abandoned tabs, deadline in words ("89 days left", "2 days overdue"), create and edit (title, why it matters, optional target date). Goals in the main nav. | ✅ |
| M2.2 | **Goal detail and progress**: `/goals/:id` with overall progress, per-habit done days against their targets, link / change target / unlink habits, mark achieved or abandon. Progress on each list card; the goal shown on habit detail. | ✅ |

## Now — Phase M3: resources (backend R.1–R.2 are done)

| # | Step | Status |
|---|---|---|
| M3.1 | **Library** (`/resources`, "Library" in the nav, which now says Home for the dashboard): notes and links, pinned first, All / Notes / Links, title search, `?goalId=` filter. Add / edit (kind, title, address, Markdown note or comment, goal, pin), pin from the card, delete with a confirm. | ✅ |
| M3.2 | **Notes and links on the goal page**: the first five, pinned first, with Add (files it under the goal and returns there) and "See all N in the library". | ✅ |
| M3.3 | **Files** (backend R.3): upload PNG / JPEG / WebP / GIF / PDF / .txt / .md up to 10 MB from the form (title taken from the file name, type and size checked before sending), Files tab, download through the authenticated client, images previewed inline. A file keeps its file when edited. | ✅ |

Notes are Markdown, rendered with `react-markdown`: raw HTML is dropped and only http(s) links are
clickable. The parser is lazy-loaded (its own ~36 kB gzipped chunk) so pages without notes don't pay
for it.

## Now — Phase M4: levels (backend X.1–X.2 are done)

| # | Step | Status |
|---|---|---|
| M4.1 | **Level**: header badge (tier-coloured; just the number on phones), dashboard card with tier, XP bar, XP to the next level and how XP is earned, and a level-up moment the first time a higher level is seen (after a check-in, an achieved goal, or on another device). | ✅ |

## Now — Phase M5: dashboard API (backend A.1–A.3 are done)

| # | Step | Status |
|---|---|---|
| M5.1 | **Dashboard on `/api/dashboard`** (replaces G.2's per-habit calls and client maths): today with streaks at risk tonight, 7 / 30 / 90-day completion with the change against the stretch before, going well / slipping, active goals with progress, level. **Patterns** from `/api/dashboard/patterns`: a year heatmap (scrolls on phones, opens on the latest weeks), completion by weekday with the strongest and weakest day, check-ins by hour with the peak. | ✅ |

## Now — Phase P: passwords (backend forgot / reset / change)

| # | Step | Status |
|---|---|---|
| P.1 | **Forgot, reset and change password**: "Forgot password?" on sign in (carries the typed email) → `/forgot-password` (same answer whether or not the account exists) → emailed `/reset-password#token=…` (token read, then taken out of the address bar; new password twice; signs in) → "Change password" in the account menu (`/account/password`). Pages are now loaded per route. | ✅ |

## Next — Phase N: new look + backend Phases 6–10 (planned 2026-10-10)

The backend finished Phases 6–10; its `docs/DEV_LOG.md` lists what the web app needs ("Frontend
needs"). Each step is one small PR. Start each by running `npm run gen:api` against the running backend.

**Design direction (confirmed 2026-10-10):** palette `#F9F9F9` white, `#004E72` blue, `#FF6E42`
orange, `#092634` navy. Orange is the brand color and stands for streaks and things done; blue is for
actions; navy is the dark-mode page and the brand panel. Contrast rules, measured:
orange on white is 2.6:1, so it is **never text on light** (use `#B4441F`, 5.3:1). Buttons are orange
**with navy text** (5.7:1), not white. In dark mode, blue on navy is 1.7:1, so links and focus use
a lighter sky `#5CB8E4` (7:1). Most of the change is in the tokens in `index.css`, because components
already use names like `lapis` and `ember`.

**UI kit (confirmed):** use **shadcn only**, HeroUI as the fallback if a piece breaks or doesn't fit. Add just the primitives a step needs (Dialog, DropdownMenu, Switch,
Sonner toasts, Tooltip). Its code is copied into the repo and styled with our tokens. Keep the house
components that work (rings, grids, `Button`, `Field`).

| # | Step | Status |
|---|---|---|
| N.0 | **Look**: new palette tokens (light + dark). Signature moments: a check-in that bursts orange, a streak flame that grows with the streak, and a navy hero on Today/Home. Verify with Playwright at 390 and 1280 in both themes. | ✅ |
| N.1 | **Habits+**: `unit` ("8 glasses"), QUIT habits (daily, no reminder; check-in reads "I slipped", clean-days count), delete for good (confirm dialog), rest day (`POST/DELETE …/rest`, cost from `restCostXp` against `xpBalance`), `resting`/`kind` on Today. | ✅ |
| N.2 | **Errors**: `PLAN_LIMIT_REACHED` (7 habits / 2 goals, explained), `RATE_LIMITED` (+`Retry-After`), `XP_NOT_ENOUGH`, `REST_LIMIT_REACHED`; hide uploads on `FILE_UPLOADS_DISABLED`. | ✅ |
| N.3 | **Email verification**: `/verify-email#token=…` page, banner with "resend" while `emailVerified` is false. | ✅ |
| N.4 | **Settings** (`/settings`): name, timezone (offer to switch when the browser differs), promotional-email toggle, theme, change password moved here, export my data, delete account (password). | ✅ |
| N.5 | **PWA + push**: manifest, icons, service worker (shows `{title, body, url}`, click opens `url`), reminders toggle in settings → subscribe / unsubscribe; unsubscribe on sign-out. | ✅ |
| N.7 | **Form controls**: shadcn calendar date picker, dropdowns, searchable timezone, switches, steppers, schedule cards. | ✅ |
| N.6 | **Google sign-in** behind `VITE_GOOGLE_CLIENT_ID` (button hidden without it) → `POST /api/auth/google`. | ✅ |

## Later — follows the backend milestones

| Backend | Frontend screens | Status |
|---|---|---|
| M2 Goals | goals list and detail, link habits to goals, progress | ✅ Phase M2 above |
| M3 Resources | resource library per habit/goal | ✅ Phase M3 above |
| M4 Levels | level, XP bar, level-up moment | ✅ Phase M4 above |
| M5 Dashboard API | swap G.2's client-side maths for the summary endpoint | ✅ Phase M5 above |
| M6 AI insights | insights panel on the dashboard | ⏸ |
| 2.3 Google sign-in | "Continue with Google" on sign in / register | ✅ Phase N (N.6) |

## Before any shared deploy

- Production build served from the same origin as the API (or `VITE_API_BASE_URL` for a split deploy).
- Decide hosting; CORS origins in the backend `.env` must match.
