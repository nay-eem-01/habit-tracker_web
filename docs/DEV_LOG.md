# DevHabit web — Development Log

Read this first at the start of every frontend session, then `docs/ROADMAP.md`. Newest entry on top.
The backend's own log is in the backend repo; note there only what the frontend needed from it.

---

## 2026-10-06 (M4 — levels)

**Done** (`feat/levels`, stacked on `feat/file-resources`)
- `api/level.ts` (`GET /api/me/level`) and `useLevel` (`['level']`, refreshed after every check-in
  on Today and when a goal is achieved).
- Header badge: tier-coloured diamond + "Lv n", or only the number in a tier-coloured ring on phones
  (at 320px the full badge wrapped the header to three rows). Screen readers hear the level, tier
  and XP to the next level.
- Dashboard card: level in a tier diamond, XP earned, a progress bar to the next level, "90 XP to
  level 2", and a "How XP works" list matching the backend's rules.
- Level-up moment: the last level seen is kept per user in `localStorage`. A first visit only
  remembers it; a higher level later (a check-in, an achieved goal, another device) shows a card
  with a burst of squares from behind its top edge, and names a new tier when it opens one. "Nice"
  marks it seen. Reduced motion: a fade, no burst. If storage is blocked, it just isn't announced.

**Checked live:** badge, card, and the moment (by lowering the remembered level), desktop and 320px.

---

## 2026-10-06 (M3.3 — files in the library)

**Done** (`feat/file-resources`; first of three stacked PRs for the backend's R.3, M4 and M5)
- `api/client.ts`: a `FormData` body goes as multipart (no JSON content type, the browser sets the
  boundary); `apiBlob` fetches a file's bytes with the token and the same one-time silent refresh.
- `uploadResourceFile` (multipart: `file` + title, body, goalId, pinned) and `downloadResourceFile`.
  Messages for `FILE_EMPTY`, `FILE_TOO_LARGE`, `FILE_QUOTA_EXCEEDED`, `FILE_TYPE_NOT_ALLOWED`,
  `FILE_NOT_FOUND`.
- Form: a third kind, File, when adding: a drop-zone picker; the title starts as the file name; the
  extension, emptiness and the 10 MB limit are checked before sending (the server still checks the
  bytes). Editing a file shows the file and changes only title, comment, goal and pin; a note or
  link can't become a file and a file stays a file, as the backend requires.
- Cards: file icon by type, "name · size", Download (blob saved under its own name), and images
  (the server only stores PNG / JPEG / WebP / GIF) previewed inline from the authenticated fetch.
- Library has a Files tab; the goal section is now "Notes, links and files".

**Backend bug found (not fixed here):** the first real upload failed with a 500. `resources` was
created before `FILE` existed, and `ddl-auto=update` never updates Hibernate's enum check
constraint, so `resources_type_check` still allowed only NOTE and LINK. Backend tests use a fresh
database, so they pass. Any database created before R.3 needs the constraint widened, or a
migration. I widened it in the local dev database only, to finish checking uploads:
`alter table resources drop constraint resources_type_check, add constraint resources_type_check
check (type in ('NOTE','LINK','FILE'))`. No other enum constraint is stale.

**Checked live:** uploaded a PNG on a goal and a .md file, the preview loaded, and the download
saved the file under its name.

---

## 2026-10-03 (M3 — library: notes and links)

**Done** (`feat/resources`, M3.1 + M3.2 in one PR)
- Backend `staging` briefly had no resources: #48 reverted goal resources on the base branch and #49
  carried that into `staging`, deleting the whole package. Nayeem restored it in backend #50 before
  this work started; built against that.
- `src/api/resources.ts`: list (type, title search, goal), a goal's list, get, create, replace, pin /
  unpin, delete. `resourceErrorMessage` shows the server's own reason for `RESOURCE_INVALID`
  ("A link needs a url", "The url must be an http or https address").
- `/resources` "Library": All / Notes / Links, title search debounced 300 ms (one request per word,
  not per key), `?goalId=` with a removable goal chip, paged. Cards: note body as Markdown (long
  notes fold with Show all), links open in a new tab with `noopener noreferrer` and show the site,
  the goal they belong to, a pin toggle, Edit, and Delete with a confirm (deleting is permanent).
- `/resources/new` and `/resources/:id/edit`: Note / Link, title, address (links), Markdown note or
  comment, goal (active goals, plus the current one even if closed), pin. `?back=` returns to where
  it was opened from (only paths inside the app are followed); `?goalId=` and `?type=LINK` preset it.
- Goal page: "Notes and links" section (first five, pinned first) between linking habits and
  finishing, shown for closed goals too.
- Nav: five links didn't fit at 320px, so "Dashboard" is now "Home" (the page title is unchanged)
  and phone padding is tighter. Measured at 320px: no sideways scroll.
- Markdown safety: `react-markdown` with `skipHtml`; links pass `safeHref` (http/https only, else
  plain text); images render as their alt text. Tested with a note carrying `<img onerror>`, a
  `javascript:` link and raw `<b>`.
- Bundle: `react-markdown` pushed the main chunk over Vite's 500 kB warning (+45 kB gzipped), so
  `Markdown` is lazy-loaded; the main chunk is 456 kB, the parser a separate 36 kB gzipped chunk.
- Checked against the live backend at desktop, 360px and 320px with seeded notes and links.

**Next:** waits on the backend — M4 levels, and R.3 file uploads once designed.

---

## 2026-10-03 (M2.2 — goal detail and progress)

**Done** (`feat/goal-detail`, stacked on `feat/goals`)
- `/goals/:id`: status badge, deadline, description; overall progress as a ring; each linked habit
  as "30 of 60 done days · 50%" with a bar, counting since the day it was linked. Archived habits
  stay listed, greyed, and say they no longer count (the backend leaves them out of the average).
- Link a habit (active habits not on this goal; one on another goal is marked, and the form warns
  that linking moves it and restarts its count), change a link's target, unlink.
- Mark achieved / abandon, each confirmed first since neither can be undone. Closed goals hide the
  link and finish controls. At 100% an active goal says so but stays open: the user decides.
- Goal list cards show progress and how many habits count; titles open the goal. Saving the goal
  form now lands on the goal, since that's where habits get linked.
- Habit detail shows the goal it counts toward, with its own done days against the target.
- `Button` got `size="small"` so a primary action can sit next to secondary buttons at their height.
- Checked against the live backend: linked two habits through the UI, checked one in, progress
  read 1 of 30 (3%) and 2% overall; desktop and 360px.

**Next:** frontend waits on the backend (M3 resources). A goals card on the dashboard is an easy
add if wanted (one progress call per active goal, same N+1 caveat as G.2).

---

## 2026-10-03 (M2.1 — goals list and form)

**Done** (`feat/goals`)
- Regenerated `src/api/schema.d.ts` from the backend's `staging` (goals, habit–goal link).
- `src/api/goals.ts`: list (by status), get, create, update. `goalErrorMessage` for goal error codes.
- `/goals`: Active / Achieved / Abandoned tabs, paged; each card shows the deadline counted from the
  user's today ("By 31 Dec 2026 · 89 days left", overdue in red), or when it was achieved.
- `/goals/new` and `/goals/:id/edit`: title, "why it matters" (new `TextAreaField`), optional date.
  The PUT is a full replace, so an emptied description or date is left out and cleared.
- Goals joined the main nav. Four links didn't fit: at 320px they scrolled sideways and at 640px
  the bell dropped to a second row, so the nav now sits inline from `md` up and uses smaller text
  on phones. Checked in the browser at 320px, 640px and desktop.

**Next:** M2.2 — goal detail, progress, linking habits, achieve / abandon.

---

## 2026-10-02 (G.3 — habit detail, visual)

**Done** (`feat/habit-detail-visual`)
- Habit detail: current streak as a bar against the longest ("3 days to beat your best" / "best run
  yet"), 7/30-day completion as rings, a 26-week heatmap (partial days of a multi-count habit shade
  lighter), and days done per week for 12 weeks against a dashed weekly-goal line.
- Shared `components/DayGrid.tsx` (heatmap + legend) now draws the dashboard grid too; its squares
  stop growing at ~1.5rem, so the 12-week grid no longer turns into big tiles on a wide card.
- Checked in a real browser against the backend (seeded half a year of logs straight into the local
  database, since the API only takes check-ins up to 7 days back): desktop, 360px phone, dark mode.

**Found and fixed**
- Dashboard completion could read "18 of 17 done": a 3-a-week habit done 6 times counted its extra
  days, covering for missed days on other habits. Each habit now counts only up to what it expected.
- Detail said "6 of 3 done" for the same case; it now says "6 done, goal 3". Prorated expectations
  (fractional days for N-a-week habits) are rounded for display.

**API limits that shaped this:** logs page size is capped at 100 and a range at 366 days, so the
heatmap is half a year and fetches two pages at most.

**Next:** Phase G is complete. Frontend work now follows the backend: M2 goals first.

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
