# Admin screens — handoff from the backend (Phase 12)

The backend's admin API is built (backend roadmap 12.1–12.3). This page is everything the web app
needs to build the `/admin` screens. Run `npm run gen:api` against the running backend first: it adds
`role` to the user and the `Admin` endpoints to `src/api/schema.d.ts`.

## Who is an admin

- `GET /api/auth/me` (and every sign-in response's `user`) now has `role`: `"USER"` or `"ADMIN"`.
- Show an **Admin** entry in the user menu only when `role === "ADMIN"`; guard the `/admin/*` routes
  the same way (anyone else → the not-found page).
- The API is the real guard: a non-admin calling `/api/admin/**` gets **404 `NOT_FOUND`** (not 403),
  so treat 404 there as "not found", not as a bug.
- There is no "make admin" in the app. Locally: `update users set role = 'ADMIN' where email = '…';`
  then sign in again (or just reload — the role is read on every request).

## Suspended accounts (affects every user, not just admin screens)

- Signing in (password, Google, refresh, password reset) as a suspended user → **403
  `AUTH_ACCOUNT_SUSPENDED`**. Show it on the sign-in page: "This account is suspended. Contact
  averydayhabits@gmail.com." A wrong password still answers `AUTH_INVALID_CREDENTIALS`.
- A user suspended while signed in: their next API call is 401, the silent refresh fails (their
  sessions were ended), so they land on sign-in — where the message above appears when they try.

## Screens

### `/admin` — overview (`GET /api/admin/stats`)

- **Cards:** users total · verified (as % of total) · with Google · Pro · suspended · active today /
  7 days / 30 days · active habits · active goals · push users · **free users at a limit** (label it
  "might upgrade" — they have 7 habits or 2 goals).
- **Two 30-day bar charts:** `users.signUps` and `usage.checkIns` (`[{date, count}]`, oldest first,
  every day present, UTC). Reuse the dashboard's chart style.
- **Delivery panel:** emails sent / failed, pushes sent / gone / failed, with "since {since}" (they
  reset when the server restarts — say so in small text). Show a failed count above 0 in the error
  color.

### `/admin/users` — list (`GET /api/admin/users`)

- Search box → `q` (part of the email, debounced ~300 ms). Table: email, name, sign-in (`authProvider`),
  verified, plan, status (Suspended badge when `suspendedAt` is present), joined (`createdAt`).
- Sort by joined or email (`sortBy=createdAt|email`, `sortDir=asc|desc`); pages (`page`, `size` ≤ 100).
- A row opens the user.

### `/admin/users/:id` — one user (`GET /api/admin/users/{id}`)

- Account: everything in `user`, plus counts: active / archived habits, check-ins, goals, last active
  (`lastActiveAt`, absent if never), push browsers. **No habit names, notes or links — by design.**
- Actions (hide all three when the user's `role` is `ADMIN`):
  - **Plan:** FREE / PRO switch → `PUT …/{id}/plan {"plan":"PRO"}`.
  - **Suspend** (confirm dialog: "They'll be signed out everywhere and can't sign in") →
    `POST …/{id}/suspend`; when suspended, the button is **Lift suspension** → `POST …/{id}/unsuspend`.
  - **Delete** (danger; confirm by typing their email) → `DELETE …/{id}` → 204 → back to the list.
- Every action answers with the updated user (except delete), so update the page from the response.

## API

All under the usual envelope `{ message, payload, … }`; admin bearer token.

| Call | Payload |
|---|---|
| `GET /api/admin/stats` | `{ users: {total, verified, withGoogle, pro, suspended, signUps[]}, active: {day, week, month}, usage: {activeHabits, activeGoals, pushUsers, freeUsersAtLimit, checkIns[]}, delivery: {since, emailsSent, emailsFailed, pushesSent, pushesGone, pushesFailed} }` |
| `GET /api/admin/users?q=&page=&size=&sortBy=&sortDir=` | page of `{id, email, name, authProvider, emailVerified, plan, role, suspendedAt?, createdAt}` |
| `GET /api/admin/users/{id}` | `{ user: {…as above}, activeHabits, archivedHabits, checkIns, goals, lastActiveAt?, pushSubscriptions }` |
| `PUT /api/admin/users/{id}/plan` `{plan}` | the user |
| `POST /api/admin/users/{id}/suspend` · `/unsuspend` | the user |
| `DELETE /api/admin/users/{id}` | 204 |

**Errors:** `NOT_FOUND` (404, not an admin) · `USER_NOT_FOUND` (404, deleted meanwhile → back to the
list) · `ADMIN_TARGET_IS_ADMIN` (409, shouldn't happen when the buttons are hidden) ·
`VALIDATION_FAILED` (400, bad `sortBy`).

## Steps

| # | Step |
|---|---|
| A.0 | `AUTH_ACCOUNT_SUSPENDED` message on sign-in (and Google sign-in) |
| A.1 | `role` from `me`; Admin menu entry; guarded `/admin` layout with Overview / Users tabs |
| A.2 | Overview: cards, two charts, delivery panel |
| A.3 | Users list: search, sort, pages |
| A.4 | User page: counts, plan switch, suspend / lift, delete |
