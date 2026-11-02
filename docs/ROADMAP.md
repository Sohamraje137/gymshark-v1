# Roadmap

Living status of the product. Update this file in the same commit as the work.
Status: ✅ done · 🚧 in progress · ⏳ next · 💭 later / needs input

## Phase 0: Platform ✅

- ✅ Next.js PWA, Google login, JWT sessions, MongoDB, Docker
- ✅ Roles: coach / client (`COACH_EMAILS`), access page (role, block)
- ✅ Dev login escape hatch + `npm run seed` demo data + `scripts/dev-login.sh`
- ✅ Domain models: ClientProfile, MealLog, WorkoutLog, ActivityLog, CheckIn, CoachingSession, CoachNote
- ✅ Messaging (client ↔ coach), announcements, video library, Google Calendar page

## Phase 1: Core coaching loop ✅ (built with dev login; Google paths noted)

| Area | Routes / files | Status |
|---|---|---|
| Client logging: meals, workouts, activities, daily view vs targets | `/log`, `components/logs/` | ✅ |
| Onboarding intake (sets time zone, status → active) | `/onboarding` | ✅ |
| Weekly check-ins (client submits, coach reviews + feedback) | `/check-ins`, `components/checkins/` | ✅ |
| Coach workspace: client list, add client, client page (overview, targets, status, notes, tabs), coach dashboard | `/clients`, `components/clients/`, `components/dashboard/CoachDashboard.tsx` | ✅ |
| Scheduling: calls with Meet links, weekly repeats, reschedule/cancel/complete | `/schedule`, `/sessions`, `components/sessions/` | ✅ without Google; Meet creation unverified live |
| Integrations: Hevy sync (API key), Cronometer CSV import | `/settings/integrations`, `src/lib/integrations/`, `docs/integrations.md` | ✅ with fixtures; real Hevy account + real Cronometer export unverified |
| Client dashboard (today vs targets, check-in status, next call) | `components/dashboard/ClientDashboard.tsx` | ✅ |

Known gaps from Phase 1:
- Coach has no time-zone setting; coach dashboard "today" uses the server zone (call times render in the browser zone).
- Validation errors in most forms throw to `(app)/error.tsx` (message hidden in production builds). Move to `useActionState` inline errors.
- Log entries can be added/deleted but not edited. Deleting an imported entry may come back on the next sync.
- Hevy incremental sync doesn't yet handle deleted/edited older workouts (switch to `/v1/workouts/events`, see `docs/integrations.md`).
- `BodyMetric` model (weight/body fat/waist from Hevy, Cronometer biometrics, Excel) not added yet; wait for the brain dump's tracker.

## Phase 2: After the brain dump 💭

- Analyse `docs/brain-dump/` → `ANALYSIS.md`; adapt check-in questions, onboarding form, targets, and plans to the coach's real process.
- Progress charts (weight, waist, adherence, volume) replacing the Excel tracker.
- Programs/plans: coach assigns training and meal plans; client sees "today's plan".
- AI assistant for the coach, using the brain-dump prompt: check-in review drafts, weekly summaries per client.
- MCP server exposing client data to the coach's Claude (read-only first).

## Later 💭

- Push notifications (check-in reminders, new messages). Requires VAPID keys.
- Progress photos (needs object storage: S3/R2/GridFS).
- Payments / packages.
- Google app verification → set `DEV_LOGIN_ENABLED=false` in production.

## Decisions log

- 2026-11-02: One coach practice per deployment (no multi-tenant). Roles `coach`/`client`.
- 2026-11-02: Days stored as `YYYY-MM-DD` in the client's time zone; metric units in the DB.
- 2026-11-02: Integrations write into the same log collections, tagged with `source` + `externalId`.
- 2026-11-02: No third-party MCP servers for client data (they're single-user and need each client's password). Pull data into our DB; later expose our own coach-only MCP server.
- 2026-11-02: Cronometer has no public API → CSV import (or Cronometer Pro for the coach). Hevy API needs Hevy Pro per client.
