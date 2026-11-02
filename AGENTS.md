<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project: coaching PWA

A PWA for one fitness/health **coach** and their **clients**. The coach manages clients, notes, calls and
calendar. Clients onboard, log meals/workouts/activities, submit weekly check-ins, and message the coach.
Status and next steps live in `docs/ROADMAP.md`. Read it before starting work, and update it when you finish a piece.
The coach's existing Claude agent export ("brain dump") goes in `docs/brain-dump/`. It is source material for features, not code.

## Stack

Next.js 16 App Router + React 19 + Tailwind 4, Auth.js v5 (Google + dev login, JWT sessions), MongoDB via Mongoose 9.
Server Components and Server Actions everywhere. There are no REST endpoints except `/api/auth/*`. Add one only for external callers such as webhooks or MCP.

## Layout

- `src/models/`: all Mongoose schemas. Import from `@/models`. Add new models here and re-export them from `index.ts`.
- `src/lib/session.ts`: `requireUser`, `requireCoach`, `requireClient`, `requireClientAccess(clientId)`.
- `src/lib/dates.ts`: day-string helpers (`todayIn`, `addDays`, `mondayOf`, `formatDay`).
- `src/lib/google-calendar.ts`: Google Calendar calls made with the user's stored refresh token.
- `src/app/(app)/<feature>/page.tsx` + `actions.ts`: one folder per feature. The `(app)` layout renders the nav (`NAV` in `layout.tsx`).
- `src/components/<feature>/`: components shared between pages, e.g. ones the coach's client page embeds.
- `scripts/seed.ts` (`npm run seed`): demo data for `@demo.local` users. Keep it working when you change models.

## Conventions

- **Authorization:** every page and every server action calls one of the `require*` helpers first. Any client id that comes from a URL or form must go through `requireClientAccess(clientId)`, or the code must check `user.role === "coach"`. Never trust a client id from the client.
- **Roles:** `coach` | `client`. `COACH_EMAILS` (env) are always coaches.
- **Days:** store calendar days as `"YYYY-MM-DD"` strings in the client's time zone (`ClientProfile.timeZone`). Compute "today" with `todayIn(tz)`. Weeks start Monday (`mondayOf`). Use `Date` only for exact instants such as call times and `createdAt`.
- **Units:** metric in the database (kg, cm, g, min, L). Convert only in the UI if needed.
- **Imports from integrations:** set `source` (`hevy` | `cronometer` | `import`) and `externalId`. A unique index de-duplicates re-imports, so upsert on `{client, source, externalId}`.
- **Mutations:** a server action in the feature's `actions.ts`, then `revalidatePath(...)`. Forms are plain `<form action={...}>`. Use client components only for real interactivity.
- **Styling:** Tailwind utilities and the shared classes in `globals.css` (`card`, `btn`, `btn-secondary`, `btn-danger`, `input`, `page-title`). Mobile-first; clients mostly use phones.
- Keep secrets out of logs and out of `select` by default (`select: false`).

## Running and verifying

- Use **http://localhost:3000**, not 127.0.0.1: Next.js reports 127.0.0.1 as localhost, so sign-in loses its cookie there. In dev, `/sw.js` is rewritten to `public/sw-dev.js`, a worker that removes itself, because a caching worker serves stale chunks and breaks hot reload. Keep dev-server logs outside the repo, e.g. in `/tmp`.
- MongoDB runs locally (`brew services start mongodb-community`). The dev server is `npm run dev` on :3000. It may already be running; check with `lsof -ti:3000` before starting another.
- **Dev login** (no Google needed): `DEV_LOGIN_ENABLED=true` in `.env.local`. Demo users after `npm run seed`:
  `coach@demo.local` (coach), `alex@demo.local` (active client with data), `priya@demo.local` (new client, not onboarded).
- **Get a session cookie for curl:** `C=$(scripts/dev-login.sh alex@demo.local); curl -b "$C" localhost:3000/log`.
- Checks: `npx tsc --noEmit`, `npx eslint <paths>`, and `npm run build`. Do not run `npm run build` while other agents are working in the repo, because it shares `.next` with the dev server. Use `tsc`, `eslint` and the dev server instead.
- Dev-login users have no Google refresh token, so Calendar/Meet features must degrade gracefully for them.
