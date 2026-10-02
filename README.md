# DevHabit web

The frontend for the [habit-tracker](https://github.com/nay-eem-01/habit-tracker) API.
React + TypeScript + Vite, TanStack Query for server state, Tailwind, React Router.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

The backend must be running on `localhost:8080`. In development Vite proxies `/api` to it, so the
browser sees one origin: no CORS, and the refresh cookie (`SameSite=Strict`, `Path=/api/auth`) works
as it will in production. For a split deploy set `VITE_API_BASE_URL`; otherwise serve the app and
the API under one domain.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | dev server with the `/api` proxy |
| `npm test` | unit tests (Vitest) |
| `npm run lint` | oxlint |
| `npm run build` | type-check and production build |
| `npm run gen:api` | regenerate `src/api/schema.d.ts` from the running backend's OpenAPI spec |

## How it talks to the API

- `src/api/client.ts` — `api<T>(path, options)` returns the envelope's `payload` and throws
  `ApiError` (with `errorCode` and field messages) otherwise.
- The access token is kept **in memory only**. A page reload gets a new one from the httpOnly refresh
  cookie (`restoreSession()`); a request that gets 401 refreshes once (shared between concurrent
  requests, since the server rotates the cookie and treats reuse as theft) and retries.
- If the refresh fails, the handler passed to `setSessionLostHandler` runs — the app signs the user
  out there.

The plan and roadmap (Phase F) live in the backend repo: `docs/ROADMAP.md`.
