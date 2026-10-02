# DevHabit web — Development Log

Read this first at the start of every frontend session, then `docs/ROADMAP.md`. Newest entry on top.
The backend's own log is in the backend repo; note there only what the frontend needed from it.

---

## 2026-10-02 (G.2 — dashboard v1)

**Done** (`feat/dashboard`)
- `/` is now the dashboard; Today moved to `/today` and the nav has both. Cards: today's progress
  (links to Today), 7/30-day completion across all habits, top three current streaks, 12-week
  activity grid. No backend changes: it uses habits list + per-habit `/streak`, `/stats`, `/logs`.
- Maths lives in `src/dashboard/dashboard.ts` (tested): completion adds days done over days
  expected across habits instead of averaging rates; day streaks rank ahead of week streaks.

**Known limit:** 3 requests per habit (N+1). Fine for a handful; if it drags, ask the backend for the
M5 summary endpoint and note the ask in the backend dev log. The activity grid reads up to 100 logs
per habit, so a habit with more than 100 logs in 12 weeks is impossible (one per day at most).

**Next:** G.3 habit detail visuals.

---

## 2026-10-02 (design tooling for G.1)

**Done**
- Skills installed at project level (`.claude/skills/`, git-ignored; `skills-lock.json` is committed,
  restore with `npx skills experimental_install`): **impeccable** (`pbakaus/impeccable`),
  **emil-design-eng** plus nine of Emil Kowalski's others for the web (animate, review-animations,
  improve-animations, find-animation-opportunities, animation-vocabulary, pick-ui-library,
  prototype, mobile-native, break-ui) from `emilkowalski/skills`, and **design-taste-frontend** from
  `Leonxlnx/taste-skill`. Left out: his Swift/Expo/Apple/Sonner skills (not this app).
- MCP servers in `.mcp.json`: **playwright** (`@playwright/mcp`, drives a real browser) and
  **figma** (`https://mcp.figma.com/mcp`, remote). Claude Code asks to approve project MCP servers
  the first time it starts here; Figma then needs a one-time sign-in (`/mcp` → figma → authenticate).

**Decided**
- taste-skill says it is aimed at landing pages and redesigns, *not* dashboards or multi-step product
  UI. Use it for the sign-in/register feel and the overall look; lean on impeccable and Emil's
  skills for the data screens (Today, habits, detail, dashboard).
- impeccable's own `skills install` failed (its zip download was not a zip), so it was installed as
  a skill through the skills CLI instead. That route adds **no** editor hook; impeccable's hook
  (auto-runs its detector on UI edits) is not installed.

## 2026-10-02 (G.0 — test pass against the live backend)

**Done**
- Ran the real app in headless Chrome against the real backend and local Postgres, desktop (1280)
  then phone (390): redirect to sign in, wrong password message, register, duplicate email message,
  create habits (daily, daily target), Today, one-tap check-in, +1, reload keeps the session and the
  check-in, habit detail (streak, stats, history), bell, archive, sign out. 22 of 23 steps passed;
  the one failure was the test's own wrong assumption (it had archived a habit earlier).
- API contract checked through the Vite proxy: register, login, 409 on duplicate, 401 on wrong
  password, habits, check-in, streak, stats, logs, notifications, cookie refresh — all as the
  frontend expects.

**Found and fixed** (`fix/bell-panel-phone`)
- Phone: the notification panel hung off the bell and ran off the left edge of the screen. It is now
  pinned to the screen on phones and hangs under the bell from `sm` up.
- 320px phones: the header (logo, links, bell, Sign out) was wider than the screen after the bell was
  added. The links now drop to their own row on phones. Verified at 320, 360, 390, 768, 1280: no
  sideways overflow, panel fully on screen.

**Seen, not a bug**
- Every first visit logs a red `401 POST /api/auth/refresh` in the console: that is the app asking
  "am I still signed in?". Harmless; could be quieted later.
- The look is plain (flat lists, no hierarchy beyond type) — that is G.1.

**Next:** G.1 design pass.

## 2026-10-02 (planning moves here)

**Done**
- F.1–F.6 merged (PRs #1–#6). 79 tests, typecheck, lint and `vite build` pass.
- Created `docs/ROADMAP.md` and this log: frontend planning now lives in this repo.

**Found while testing against the real backend**
- Sign-up always said "email already exists" — backend bug, not the frontend: stale columns in the
  local `users` table plus an error handler that disguised every database error as a duplicate
  email. Fixed in the backend (`fix/email-taken-masking`); the stale columns were dropped by hand.

**Decided**
- The app felt thin for two reasons: backend features not built yet (goals, levels, dashboard, AI),
  and a design pass that never happened. The design pass and a first dashboard (Phase G) do not
  need the backend, so they come next, after a proper test pass (G.0).

**Next:** G.0 test pass, then G.1 design pass.
