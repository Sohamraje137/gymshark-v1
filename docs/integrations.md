# Integrations: Hevy, Cronometer, Excel

Goal: workouts (Hevy), meals (Cronometer) and progress (the coach's Excel tracker) land in our own collections, so the
coach sees one place. Imports write to `WorkoutLog` / `MealLog` / `ActivityLog` with `source` + `externalId` and
upsert on `{client, source, externalId}` (partial unique index), so re-imports never duplicate.

Code: `src/lib/integrations/hevy.ts`, `src/lib/integrations/cronometer.ts`, UI at `/settings/integrations` (client only).
Research done 2026-11-02.

## 1. Hevy (workouts): official REST API ✅ implemented

| | |
|---|---|
| Docs | Swagger UI [api.hevyapp.com/docs](https://api.hevyapp.com/docs) (OpenAPI 0.0.1, "use at your own risk") |
| Base URL | `https://api.hevyapp.com` (the spec declares no `servers`; all paths start `/v1`) |
| Auth | header `api-key: <uuid>`. No OAuth: one key = one Hevy account |
| Plan | **Hevy Pro only** ("Currently, this API is only available to Hevy Pro users") |
| Getting a key | user signs in at [hevy.com/settings?developer](https://hevy.com/settings?developer) and generates it |
| List | `GET /v1/workouts?page=1&pageSize=10` (pageSize max 10) → `{page, page_count, workouts[]}`. Newest first in practice; the spec does not say ([observed](https://github.com/alexseipel/hevy-skill/blob/main/skills/hevy-api/SKILL.md)) |
| Incremental | `GET /v1/workouts/events?page&pageSize&since=<ISO>` → `{page, page_count, events[]}` with `{type:"updated", workout}` or `{type:"deleted", id, deleted_at}`, newest first. Always pass `since` (omitting it returned 0 events in third-party tests) |
| Other | `GET /v1/workouts/count`, `/v1/workouts/{id}`, `/v1/body_measurements` (weight_kg, fat_percent, waist, …), `/v1/exercise_history/{templateId}`, routines, exercise templates, `/v1/user/info` |
| Rate limits | **Not documented.** Docs ask callers not to poll exactly at xx:00. Third parties have seen 429s that cleared within ~45 s ([hevy-skill](https://github.com/alexseipel/hevy-skill)) |
| Errors | bad key → `401`, body is the plain text `InvalidApiKey` (`text/html`, not JSON). **Verified by us** with a fake key on `/v1/workouts` and `/v1/workouts/events` |
| Webhooks | **Not in the public API.** Webhook subscription endpoints exist only on Hevy's private web-session API ([diecoscai/hevy-mcp](https://github.com/diecoscai/hevy-mcp#webhooks--intentionally-not-exposed)) |

Workout JSON (from the spec's `Workout` schema; all metric):

```json
{ "id": "b459cba5-…", "title": "Morning Workout 💪", "routine_id": "…", "description": "Pushed myself…",
  "start_time": "2021-09-14T12:00:00Z", "end_time": "…", "updated_at": "…", "created_at": "…",
  "exercises": [{ "index": 0, "title": "Bench Press (Barbell)", "notes": "…", "exercise_template_id": "05293BCA",
    "superset_id": 0,
    "sets": [{ "index": 0, "type": "normal|warmup|dropset|failure", "weight_kg": 100, "reps": 10,
      "distance_meters": null, "duration_seconds": null, "rpe": 9.5, "custom_metric": 50 }] }] }
```

Mapping → `WorkoutLog` (`mapHevyWorkout`, pure, fixture-checked):

| WorkoutLog | Hevy |
|---|---|
| `date` | local day of `start_time` in `ClientProfile.timeZone` (`todayIn(tz, start)`); e.g. `2021-09-15T02:30Z` → `2021-09-14` in New York |
| `title` | `title` (fallback "Hevy workout", max 200) |
| `durationMin` | `round((end_time − start_time) / 60 s)`, omitted if ≤ 0 |
| `notes` | `description` (max 2000) |
| `exercises[].name` / `.notes` | `exercises[].title` / `.notes`, sorted by `index` |
| `sets[].weightKg / reps / durationSec / distanceM / rpe` | `weight_kg / reps / duration_seconds / distance_meters / rpe` (nulls dropped; no conversion needed) |
| `source`, `externalId` | `"hevy"`, workout `id` |
| dropped | `type` (warmup etc.), `superset_id`, `custom_metric`, `exercise_template_id`, `routine_id` |

Sync (`syncHevyWorkouts(clientId)`): page through `/v1/workouts` until a whole page starts before
`hevyLastSyncAt − 2 days` (first sync: 90 days; cap 100 pages), bulk-upsert, then set `hevyLastSyncAt`. 401 and 429
become a readable `HevyApiError`; on error `hevyLastSyncAt` is not advanced.

## 2. Cronometer (meals): no public API → CSV import ✅ implemented

- **API:** none for individuals or coaches. Only integration partners (Everfit, Kalix, Practice Better) have API
  access ([Pro FAQ](https://cronometer.com/blog/cronometer-pro-faq/)).
- **Cronometer Pro** (practitioners, from $39.99/month for 10 clients; clients get Gold free): the coach can view and
  edit each client's diary, profile, targets, macro scheduler, charts, nutrition report, snapshots and notes, generate
  reports, and **export a client's data to CSV** for a date range
  ([client view](https://support.cronometer.com/hc/en-us/articles/360021494291-Pro-Client-Profile),
  [settings menu](https://support.cronometer.com/hc/en-us/articles/360024707231-Pro-Client-Settings-Menu)). So a coach
  on Pro can export for every client and upload here (needs a coach-side upload, see phase 2).
- **Exports** (web only: More → Account → Account Data → Export Data,
  [docs](https://support.cronometer.com/hc/en-us/articles/360018760151-Account-Settings)). Column names below come
  from the parsers in [gocronometer](https://github.com/jrmycanady/gocronometer/blob/master/parse.go) and
  [cronometer-mcp](https://github.com/cphoskins/cronometer-mcp); we have not yet seen a real file from the coach.

| Button → file | Columns |
|---|---|
| Export Food & Recipe Entries → `servings.csv` | `Day` (YYYY-MM-DD), `Time`, `Group` (diary group: Breakfast, Lunch, Dinner, Snacks or custom), `Food Name`, `Amount` (e.g. `3.00 large`), `Energy (kcal)`, `Alcohol (g)`, `Caffeine (mg)`, `Water (g)`, vitamins/minerals…, `Carbs (g)`, `Fiber (g)`, `Sugars (g)`, `Net Carbs (g)`, `Fat (g)`, fat breakdown…, `Protein (g)`, amino acids…, `Category` |
| Export Daily Nutrition → `dailysummary.csv` | `Date`, `Energy (kcal)`, same nutrient columns, `Completed`. With **Include diary group rows** checked, rows are also broken down per diary group (we read a `Group` column; exact layout unverified) |
| Export Exercises → `exercises.csv` | `Day`, `Time`, `Group`, `Exercise`, `Minutes`, `Calories Burned` |
| Export Biometrics → `biometrics.csv` | `Day`, `Time`, `Metric` (Weight, Body Fat, …), `Unit`, `Amount` |
| Export Notes → `notes.csv` | Day + note text (columns not verified) |

- **Unofficial libraries:** [jrmycanady/gocronometer](https://github.com/jrmycanady/gocronometer) (Go, GPL-2.0,
  ~130★, updated 2026-08) and its CLI [cronometer-export](https://github.com/jrmycanady/cronometer-export) log in with
  the user's password and call the web app's private GWT export. The author says it is for personal backups only, not
  integrations, and Cronometer allows **10 exports per day**. Not suitable for us.

Mapping → `MealLog` (`parseCronometerCsv`): one meal per (day, diary group).

| MealLog | servings.csv |
|---|---|
| `date` | `Day` (already the client's local day; rows with another format are skipped) |
| `mealType` | `Group`: Breakfast/Lunch/Dinner → same; Snacks and any custom group → `snack` |
| `description` | `Food Name (Amount)` joined with ", " (max 1000) |
| `calories` / `proteinG` / `carbsG` / `fatG` | sums of `Energy (kcal)` / `Protein (g)` / `Carbs (g)` / `Fat (g)` (kcal rounded, grams to 0.1) |
| `source`, `externalId` | `"cronometer"`, `` `${Day}:${Group}` `` |

`dailysummary.csv` with group rows maps to the same `externalId`, so it updates the same meals (it only sets the
numbers; the description is kept). A daily summary without group rows, exercises and biometrics are rejected with a
message. Rows skipped: invalid day, missing group, missing food name, day-total rows. Upload limit 1 MB (the default
Server Action body limit).

## 3. MCP servers

| Server | Status (2026-11) | Exposes |
|---|---|---|
| [chrisdoc/hevy-mcp](https://github.com/chrisdoc/hevy-mcp) (TS, MIT, ~530★, pushed 2026-10-30) | Active, npm `hevy-mcp`, hosted Streamable HTTP at `mcp.hevy-mcp.dev/mcp` | 23 tools: workouts (list/get/count/events/create/update), routines, folders, exercise templates + history, body measurements, a training-summary tool. Uses the official API key |
| [diecoscai/hevy-mcp](https://github.com/diecoscai/hevy-mcp), [Yurzs/hevy-mcp](https://github.com/Yurzs/hevy-mcp) | Small (0★) | Same official endpoints |
| [cphoskins/cronometer-mcp](https://github.com/cphoskins/cronometer-mcp) (Python, MIT, ~27★, active) | Active | Diary, macros, micronutrients, biometrics, raw CSV export. Uses the private GWT web API with the user's **username + password** |
| [rwestergren/cronometer-api-mcp](https://github.com/rwestergren/cronometer-api-mcp) (Python, MIT, ~70★, active) | Active | Food log, macro targets, fasting, biometrics, diary edits through the reverse-engineered **mobile** REST API (password, optional TOTP) |

These are single-user tools: each runs with one person's Hevy key or Cronometer password. For a coach with many
clients that means collecting clients' secrets (and, for Cronometer, using private APIs). **Recommendation:** keep
third-party data flowing into our DB (sections 1–2), then expose **our own read-only MCP server** to the coach's
Claude: one endpoint, coach-only auth, every client, all sources already merged (ROADMAP phase 2 item). Suggested tools:
`list_clients`, `get_client_overview(clientId)` (profile, targets, status), `get_logs(clientId, from, to, kind)`,
`get_checkins(clientId, from, to)`, `get_weekly_summary(clientId, week)`. Transport: Streamable HTTP at `/api/mcp`
(AGENTS.md allows a REST endpoint for MCP), authorised as the coach (OAuth or a per-coach bearer token), read-only first.

## 4. Excel / progress tracker

| Option | Verdict |
|---|---|
| Ask for **CSV** ("Save as → CSV UTF-8") and parse with our CSV parser | No dependency, works today. One sheet per file. **Recommended first step** |
| SheetJS CE `xlsx` from the CDN tarball (`npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`) | Best .xlsx reader. Must come from the CDN: npm `xlsx` is stuck at 0.18.5 (2022) with [CVE-2023-30533](https://cdn.sheetjs.com/advisories/CVE-2023-30533) (prototype pollution when reading files, fixed 0.19.3) and [CVE-2024-22363](https://cdn.sheetjs.com/advisories/CVE-2024-22363) (ReDoS, fixed 0.20.2) ([install docs](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/)). Non-registry dependency to track by hand |
| `exceljs` | Last release 4.4.0 (2023-10, per npm); [CVE-2026-78208](https://nvd.nist.gov/vuln/detail/CVE-2026-78208) (path traversal in `addImage`, a write path). Heavier; mostly used for writing |

**Recommendation:** wait for the real tracker (`docs/brain-dump/sheets/`), then build a CSV importer for its exact
columns. Add SheetJS 0.20.3 from the CDN only if the coach cannot export CSV (for example, many tabs per client).

## Phased plan

1. **Done:** Hevy key + manual "Sync now"; Cronometer `servings.csv` (and grouped `dailysummary.csv`) upload; Excel placeholder.
2. **Next:**
   - Deletions and edits to older workouts: switch incremental syncs to `/v1/workouts/events?since=hevyLastSyncAt` and delete `{source:"hevy", externalId:id}` on `deleted` events.
   - Scheduled Hevy sync (cron hitting a protected route, at a random minute as Hevy asks).
   - Coach-side Cronometer upload for a chosen client (Pro export), via `requireCoach` + client picker.
   - Raise `serverActions.bodySizeLimit` to `6mb` and the upload limit to 5 MB.
3. **Model work (needs `src/models`):**
   - `setType` on workout sets, so warmups do not count as volume.
   - Biometrics: a `BodyMetric` collection (`client, date, weightKg, bodyFatPct, waistCm, …, source, externalId`) for Hevy `/v1/body_measurements`, Cronometer `biometrics.csv` and the Excel tracker.
   - Optionally map Cronometer `exercises.csv` → `ActivityLog` (`type:"cardio"`, `value: Minutes`, `unit:"min"`, `externalId: Day:Time:Exercise`).
   - Optionally store fiber/sodium on `MealLog`.
4. **Excel importer** after seeing the sheet (CSV first).
5. **Read-only MCP server** for the coach's Claude over our merged data.
