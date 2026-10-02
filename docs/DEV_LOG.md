# DevHabit web — Development Log

Read this first at the start of every frontend session, then `docs/ROADMAP.md`. Newest entry on top.
The backend's own log is in the backend repo; note there only what the frontend needed from it.

---

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
