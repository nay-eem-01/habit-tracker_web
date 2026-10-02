# DevHabit web — Roadmap

The frontend's plan, status and design decisions. The backend's plan is in the backend repo
(`habit-tracker/docs/ROADMAP.md`); its dev log only notes that frontend work happened and what it
needed from the API. Update this file in the same PR that finishes a step.

**Legend:** ✅ done · 🔄 in progress · ⬜ not started · ⏸ waiting on the backend

**Branch flow:** one step per branch, taken from `staging` (or the previous step's branch), PR into
`staging`. Claude commits and pushes and gives PR links; Nayeem opens and merges.

## Where we are (2026-10-02)

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
| G.2 | **Dashboard v1** (`/dashboard`, the home page; Today moved to `/today`): today's progress, longest current streaks, 7/30-day completion across habits, a 12-week activity grid. Built from existing endpoints (habits list + per-habit `/streak`, `/stats`, `/logs`). | 🔄 |
| G.3 | **Habit detail, visual**: calendar heatmap of the history, streak and completion shown as charts, not just numbers. | ⬜ |

Notes on G.2: per-habit calls are N+1 and fine for a handful of habits, not for dozens. If it feels
slow, ask the backend for one summary endpoint (that is the backend's M5 dashboard) instead of
adding client-side cleverness. Record the ask in the backend dev log when it is made.

## Later — follows the backend milestones

| Backend | Frontend screens | Status |
|---|---|---|
| M2 Goals | goals list and detail, link habits to goals, progress | ⏸ |
| M3 Resources | resource library per habit/goal | ⏸ |
| M4 Levels | level, XP bar, level-up moment | ⏸ |
| M5 Dashboard API | swap G.2's client-side maths for the summary endpoint | ⏸ |
| M6 AI insights | insights panel on the dashboard | ⏸ |
| 2.3 Google sign-in | "Continue with Google" on sign in / register | ⏸ |

## Before any shared deploy

- Production build served from the same origin as the API (or `VITE_API_BASE_URL` for a split deploy).
- Decide hosting; CORS origins in the backend `.env` must match.
