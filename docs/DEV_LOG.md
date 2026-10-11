# DevHabit web — Development Log

Read this first at the start of every frontend session, then `docs/ROADMAP.md`. Newest entry on top.
The backend's own log is in the backend repo; note there only what the frontend needed from it.

---

## 2026-10-10 (N.4 — settings)

**Done** (`feat/settings`, on top of `feat/verify-email`)
- `/settings` ("Settings" in the account menu): profile (name, timezone from the browser's list of
  region names, promotional email off by default) via `PUT /api/me`, which updates the signed-in
  user in place. When this device's timezone differs from the saved one it offers "Use it".
- Password: links to the existing change-password page (kept where it was; the menu still has it).
- Your data: "Download my data" saves `devhabit-export.json` (checked live: profile, habits,
  check-ins, goals, resources).
- Delete account: opens a form; the password is required for password accounts (the app can't tell
  if a Google account has one, so the hint says to leave it empty then). Success signs out here.
- Theme stays in the account menu, not duplicated in Settings.

## 2026-10-10 (N.3 — email verification)

**Done** (`feat/verify-email`, on top of `feat/error-states`)
- `/verify-email#token=…` (open signed in or out): token read from the fragment and taken out of the
  address bar, then confirmed at once. A query, not an effect, so the single-use token is sent once
  even when React renders twice. Success says "Email confirmed" (→ app or sign in); a used or
  expired link says so.
- A banner under the header while `user.emailVerified` is false, with "Send it again"
  (`POST /api/auth/email/verification`); a 429 says how long to wait; "already confirmed" (from another
  device) hides it.
- `AuthUser` gains `emailVerified`, `marketingEmails`, `plan`; the auth context gains `updateUser`
  (Settings uses it next).
- Checked live: banner and resend, bad link. The happy path is covered by tests only (the token
  is in the email).

## 2026-10-10 (N.2 — limits and errors)

**Done** (`feat/error-states`, on top of `feat/habits-plus`)
- `PLAN_LIMIT_REACHED` (7 habits / 2 goals on the free plan): the server's message already names the
  limit and the way out, so it is shown as is, wherever habits or goals are created or restored.
- `RATE_LIMITED`: `ApiError.retryAfter` from the `Retry-After` header; auth pages say "Try again in
  a minute / N minutes". Checked through the dev proxy: the header arrives.
- Uploads: `VITE_FILE_UPLOADS=false` hides "File" in the library form (on unless set, so dev and
  tests are unchanged); `FILE_UPLOADS_DISABLED` gets a plain message if the server refuses anyway.
  Existing files still show and download.
- No toasts: every error already has an inline place next to what failed, so Sonner wasn't needed.

## 2026-10-10 (N.1 — habits+: units, quit habits, rest days, delete)

**Done** (`feat/habits-plus`, on top of `feat/new-look`)
- Units: optional "Unit" on the form (≤ 20); Today reads "3 of 8 glasses today", the list and detail
  "8 glasses a day".
- Quit habits: "Build a habit / Quit a habit" on create only (the server refuses a change; editing
  says so). A quit habit is sent as daily, once, no unit or reminder. On Today they sit in their own
  "Staying clean" list, outside the done count: "Clean today" with "I slipped" (a check-in of 1) and
  Undo. History says Clean / Slipped.
- Rest days: daily and chosen-day build habits that aren't started today get "Rest today · free /
  100 XP / 200 XP", priced from this week's rests in the logs Today already loads (same rule as the
  server). A paid rest asks first and shows the XP balance (`xpBalance` from `/api/me/level`); short
  of XP it says so and offers no Yes. A rested habit shows in Done with a moon and "Take it back"
  (refunded). History shows "Rest day, 100 XP".
- Delete for good on the habit page, with the same inline "Yes, delete / Keep it" as the library.
  It drops the cached habit lists so the list doesn't flash the deleted one.
- Messages for `REST_*`, `XP_NOT_ENOUGH`, `HABIT_QUIT_INVALID`.
- No shadcn component needed: the house inline confirm covered both confirms.
- Checked live at 390: quit habit created, slip and undo, free rest, delete.

## 2026-10-10 (N.0 — new look)

**Done** (`feat/new-look`)
- Palette confirmed by Nayeem: `#F9F9F9` white, `#004E72` blue, `#FF6E42` orange, `#092634` navy.
  Swapped in the tokens in `index.css` (names kept, so pages didn't change): navy is the ink and the
  dark-mode page, blue is for actions and links, orange means done and streaks.
- Contrast, measured: orange text on light is 2.6:1, so `ember-deep` is `#B4441F` (5.5:1). Text on
  orange is always navy (`--color-navy`, 5.7:1). Dark mode lifts the blue to `#1C77A6` and links to
  `#5CB8E4` (6:1 on the surface).
- Primary actions are orange with navy text, from one `PRIMARY` class in `components/styles.ts`
  (`Button` and the five "Add"/"Continue" links copied the same string before).
- Today: the check box fills orange; finishing a habit throws a ring and six squares (reusing the
  level-up burst). The row moves to Done when it's finished, so `TodayPage` remembers which habit was
  just finished and that row plays the burst as it mounts. The streak flame grows with the run (up
  to a month) and flickers gently from 7 days on. Heatmaps fill orange.
- Checked in Playwright at 1280 / 390 / 320, light and dark: no sideways scroll; burst seen.
- `src/api/schema.d.ts` regenerated from the backend (Phases 6–10).

**Decided**
- UI kit: shadcn only, added a component at a time when a step needs one; HeroUI is the fallback if
  a shadcn piece breaks or doesn't fit. N.0 needed none.

## 2026-10-08 (P.1 — forgot, reset and change password)

**Done** (`feat/password-reset`)
- `api/auth.ts`: `forgotPassword`, `resetPassword` and `changePassword`. Reset and change return a
  session like sign-in does, and the new access token is kept the same way.
- `/forgot-password`: opens from "Forgot password?" on sign in, with the typed email carried over.
  It always answers "if there's an account…", like the server, so it never reveals whether an
  account exists. Has a "Use a different email" link.
- `/reset-password#token=…`: the token is read from the fragment, then removed from the address bar
  and the history. The new password is typed twice and checked first (8+ characters, matching).
  On success it signs in and opens the dashboard. An expired or used link, or one with no token,
  gets "This link doesn't work" and "Ask for a new link".
- `/account/password` ("Change password" in the account menu): current password, then the new one
  twice. A wrong current password shows on its field. An account with no password yet is pointed
  to "Set one by email". This session gets fresh tokens; the page says other devices are signed out.
- Forgot and reset are open whether signed in or out: an emailed link can be opened anywhere.
- **Client fix:** the API client didn't refresh an expired token on any `/api/auth/` path. That's
  right for sign-in, but `/password/change` and `/me` need a token, so they now refresh like any
  other call. Only the public auth endpoints skip the refresh.
- **Bundle:** this pushed the main chunk past Vite's 500 kB warning (505 kB), so every page is now
  lazy-loaded (`React.lazy`). The main chunk is 325 kB, and the header stays while a page loads.

**Checked live** against the backend. Email is off in dev and the link isn't logged, so I inserted
a reset token with a known value for the demo account (the server's own forgot request had made a
real one). Results:
- The link opened and the token left the address bar.
- The new password was saved and it signed in.
- The same link a second time gave "This link doesn't work".
- Change password with a wrong current password showed the field error, then succeeded with the
  right one, and the session survived a reload.
- The demo password is back to `Demo-pass-123`.

**Backend note:** it now runs Flyway, and its "restate enum checks" migration fixes the stale
`resources_type_check` constraint found in M3.3.

---

## 2026-10-06 (M5 — dashboard on the server's numbers)

**Done** (`feat/dashboard-api`, stacked on `feat/levels`)
- `api/dashboard.ts`: `GET /api/dashboard` and `GET /api/dashboard/patterns`, typed from the
  backend records. The dashboard no longer makes 3 calls per habit; `dashboard.ts`'s client maths
  (`combineStats`, `topStreaks`, `activityWeeks`) is gone, replaced by display helpers (heatmap
  week columns, shade levels, "+12 pts" changes, hour labels).
- Cards: Today (done of due, plus streaks that end tonight with the check-ins still needed);
  completion for 7 / 30 / 90 days, each with its change against the same stretch before; last 30
  days going well and slipping; active goals with progress; the level card from M4.
- Patterns: a 365-day heatmap (53 week columns; on a phone it scrolls inside its card and opens on
  the latest weeks), completion by weekday with the strongest and weakest named, check-ins by hour
  with the peak.
- The dashboard query is fetched fresh on every visit (one call), so check-ins made on Today show at
  once; patterns are cached for a minute.

**Found and fixed in the browser (sparse real data)**
- "Going well" listed habits at 0%: the server sends the top three by rate even at zero. Only rates
  above 0 are shown.
- "Strongest on Mondays" with every weekday at 0%: the server breaks ties by the earlier day. When
  every day has the same rate, no strongest or weakest is named.
- At 360px the year heatmap stretched its grid column and the whole page scrolled sideways; the
  grids now use `grid-cols-1` (`minmax(0, 1fr)`) so the heatmap scrolls inside its card.

**Next:** waits on the backend: M6 AI insights, 2.3 Google sign-in.

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
