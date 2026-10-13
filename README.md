# DevTrack Frontend

React + TypeScript + Vite client for the DevTrack backend (projects, issues, comments, labels, members).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:5173 |
| `npm run build` | Type-check and production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |

## Configuration

Copy `.env.example` to `.env.local` and set:

```
VITE_API_BASE_URL=https://devtrack-backend-qm3r.onrender.com
```

The value is read only in `src/lib/api.ts`. Do not commit secrets; `.env.local` is git-ignored.

## Structure

```
src/
  app/          router, guards, App
  components/   ui (design system), layout, common
  features/     auth, dashboard, projects, issues, comments, labels (UI + service per feature)
  hooks/        useAsync (abortable fetch), useAction (no double submit), ...
  lib/          api.ts (Axios), format, permissions, validation
  styles/       globals.css (design tokens) + component/layout/page styles
  types/        API DTO types
```

## Authentication contract (verified against the backend source and `/v3/api-docs`)

- `POST /api/auth/register` returns the created user (no token); the UI then sends the user to sign in.
- `POST /api/auth/login` returns `{ accessToken, tokenType: "Bearer", expiresIn, user }`. The token lives 15 minutes.
- The backend has **no refresh endpoint and no cookie sessions**, so the frontend keeps the token **in memory only**.
  A page reload or token expiry ends the session and the user signs in again. Nothing is written to local/session storage.
- Any 401 on an authenticated request signs the user out and shows a "session expired" notice.
- Route guards are a UX convenience; the backend authorizes every request.

## Backend limitations that shape the UI

- No cross-project issue list: the Issues page requires choosing a project. Filters, sorting and paging are server-side.
- No summary endpoints: the dashboard computes counts from the 100 most recently updated issues of each of the 5 most
  recently updated projects, and says so when the data is truncated.
- No user search: members are added by the email of an existing account.
- Project text search is not supported by the API; the projects page only narrows the loaded page client-side.
- Projects cannot be deleted; "Archive" (owner only) makes a project read-only and can be reversed by an owner.

## CORS (action required for local development)

The backend only allows origins listed in its `CORS_ALLOWED_ORIGINS` setting (wildcards are rejected). As of 2026-10-13
the deployed Render service rejects preflight requests from `http://localhost:5173` (`403 Invalid CORS request`), so
browser calls from the local dev server fail until one of these is done by the backend owner:

1. Add `http://localhost:5173` to `CORS_ALLOWED_ORIGINS` on Render (and the deployed frontend origin for production), or
2. Run the backend locally with the `local` profile (it allows `http://localhost:5173`) and point `VITE_API_BASE_URL`
   at it, e.g. `http://localhost:8080`.

Do not work around this with wildcard origins, disabled browser security, or a production Vite proxy.

## Render cold starts

The free Render instance can take up to ~60 seconds to wake up. Requests use a 60 s timeout, show loading
states, and surface a clear message with a retry action if the server is unavailable.
