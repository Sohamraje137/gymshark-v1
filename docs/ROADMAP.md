# Roadmap

Living status of the product. Update this file in the same commit as the work.
Status: ✅ done · 🚧 in progress · ⏳ next · 💭 later / needs input

## Phase 0: Platform ✅

- ✅ Next.js PWA, Google login, JWT sessions, MongoDB, Docker
- ✅ Roles: coach / client (`COACH_EMAILS`), access page (role, block)
- ✅ Dev login escape hatch + `npm run seed` demo data + `scripts/dev-login.sh`
- ✅ Domain models: ClientProfile, MealLog, WorkoutLog, ActivityLog, CheckIn, CoachingSession, CoachNote
- ✅ Messaging (client ↔ coach), announcements, video library, Google Calendar page

## Phase 1: Core coaching loop 🚧

| Area | Routes / files | Status |
|---|---|---|
| Client logging: meals, workouts, activities, daily view vs targets | `/log`, `components/logs/` | 🚧 |
| Onboarding intake | `/onboarding` | 🚧 |
| Weekly check-ins (client submits, coach reviews + feedback) | `/check-ins`, `components/checkins/` | 🚧 |
| Coach workspace: client list, client page, notes, targets, status, coach dashboard | `/clients`, `components/dashboard/CoachDashboard.tsx` | 🚧 |
| Scheduling: weekly/monthly calls with Google Meet links | `/schedule`, `/sessions`, `components/sessions/` | 🚧 |
| Integrations: Hevy sync, Cronometer + Excel/CSV import | `/settings/integrations`, `src/lib/integrations/` | 🚧 |
| Client dashboard (today, this week's check-in, next call) | `components/dashboard/ClientDashboard.tsx` | ⏳ |

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
