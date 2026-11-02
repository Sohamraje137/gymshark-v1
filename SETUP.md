# Setup & usage guide

A Progressive Web App with Google login, JWT sessions, admin/user roles, Google Calendar,
announcements, two-way messaging, and embedded videos.

## What you need to give the app

| Value | What it is | Where to get it |
|---|---|---|
| `AUTH_GOOGLE_ID` | Google OAuth client ID | Google Cloud Console, step 1 below |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret | Same place as the client ID |
| `AUTH_SECRET` | Random secret that signs the JWT session cookie | Run `npx auth secret` or `openssl rand -base64 32` |
| `MONGODB_URI` | Database connection string | Local MongoDB, Docker, or MongoDB Atlas (free tier), step 2 below |
| `ADMIN_EMAILS` | Your Google email(s), comma-separated | You choose |
| `AUTH_URL` | Public URL of the app | `http://localhost:3000` locally, `https://your-domain` in production |

You **don't** need a YouTube API key. Videos are embedded from their normal share links.
You also **don't** need a separate Calendar API key. Calendar access uses the same Google login.

---

## 1. Google OAuth client (login + Calendar)

1. Go to <https://console.cloud.google.com/> and create a project (top bar → *New project*).
2. **Enable the Calendar API:** *APIs & Services → Library* → search **Google Calendar API** → *Enable*.
3. **Set up the consent screen:** go to *APIs & Services → OAuth consent screen* (newer consoles call it *Google Auth Platform*).
   - User type: **External**.
   - App name, support email, developer email: anything you like.
   - **Data access / Scopes:** add `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`, and
     `https://www.googleapis.com/auth/calendar.events`.
   - **Audience / Test users:** add your own Google account and anyone else who should be able to log in while the app is in *Testing* mode (up to 100 users).
4. **Create the credentials:** *APIs & Services → Credentials → Create credentials → OAuth client ID*.
   - Application type: **Web application**.
   - Authorised JavaScript origins: `http://localhost:3000` (add `https://your-domain` later).
   - Authorised redirect URIs: `http://localhost:3000/api/auth/callback/google`
     (add `https://your-domain/api/auth/callback/google` later).
5. Copy the **Client ID** to `AUTH_GOOGLE_ID` and the **Client secret** to `AUTH_GOOGLE_SECRET`.

> **Testing vs. production:** while the consent screen is in *Testing*, only listed test users can log in, and
> Google expires their Calendar refresh tokens after **7 days**. When this happens, users click
> *Connect Google Calendar* again. To remove both limits, click *Publish app*. Because `calendar.events` is a
> "sensitive" scope, Google will ask you to verify the app (privacy policy URL, short demo video). This usually takes a few days.

## 2. Database (MongoDB, free)

Choose one option. The app code is the same for all three; only `MONGODB_URI` changes.

- **Local (development):** install MongoDB Community (macOS: `brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`).
  `MONGODB_URI=mongodb://127.0.0.1:27017/sachina`
- **Docker on your own small server:** `docker-compose.yml` already includes MongoDB. See *Deploy* below.
- **MongoDB Atlas (cloud, free M0 tier, 512 MB):** <https://www.mongodb.com/cloud/atlas/register> → create a free cluster →
  *Database Access*: add a user → *Network Access*: allow your server's IP (or `0.0.0.0/0` to test) →
  *Connect → Drivers* → copy the `mongodb+srv://...` string and add the database name `/sachina` before the `?`.

To move between them later, run `mongodump` on the old database and `mongorestore` into the new one, then change `MONGODB_URI`.

## 3. Run it locally

```bash
cp .env.example .env.local     # then fill in the values
npm install
npm run dev                    # http://localhost:3000
```

Sign in with a Google account listed in `ADMIN_EMAILS`. That account becomes an admin automatically.
Everyone else becomes a regular user on first login.

Other scripts: `npm run build`, `npm start` (production server), `npm run lint`.

---

## How it works

```
Browser (PWA) ──► Next.js (pages + server actions) ──► MongoDB
      │                     │
      │                     └──► Google Calendar API (using the user's stored refresh token)
      └──► Google login (Auth.js) ──► JWT session cookie
```

| Feature | Where | Notes |
|---|---|---|
| Google login | `src/auth.ts` | Auth.js v5. On first login a `User` document is created in MongoDB. |
| JWT sessions | `src/auth.ts`, `src/proxy.ts` | Sessions are a signed, encrypted JWT cookie with a 30-day sliding expiry. Sessions are not stored in the database. |
| Roles / admin | `src/lib/session.ts`, `/admin` | `requireUser()` / `requireAdmin()` re-read the role from the database, so promoting, demoting, or blocking someone takes effect immediately. |
| Calendar | `src/lib/google-calendar.ts`, `/calendar` | Lists upcoming events and adds new ones to the user's primary Google Calendar. |
| Announcements | `/announcements` | Admins post and delete; everyone reads. |
| Messaging | `/messages` | Each user has one private thread with the admin team. Admins see an inbox, and users who need a reply are flagged. Not real-time: messages appear on refresh or navigation. |
| Videos | `src/lib/video.ts`, `/videos` | Admins paste a YouTube (watch, youtu.be, shorts, live) or Vimeo link. Other sites are rejected. |
| PWA | `src/app/manifest.ts`, `public/sw.js` | Installable ("Add to Home Screen"), app icons, and an offline fallback page. |
| Data models | `src/models/index.ts` | `User`, `Announcement`, `Message`, `Video` (Mongoose). |

### Common changes

- **Rename the app or change its colour:** edit `src/lib/site.ts`, then replace the icons in `public/icons/`
  (192×192, 512×512, a 512×512 maskable icon, and a 180×180 Apple touch icon). <https://realfavicongenerator.net> can generate them.
- **Add a page:** create `src/app/(app)/your-page/page.tsx` and call `await requireUser()` (or `requireAdmin()`) at the top.
  Then add a link in `src/app/(app)/layout.tsx`.
- **Add a data model:** add a schema in `src/models/index.ts`.
- **Admin rules:** people in `ADMIN_EMAILS` are made admin again every time they log in. Use the Admin page for everyone else.

### Installing the PWA

- **Android / desktop Chrome or Edge:** open the site and use the install icon in the address bar or *Add to Home screen*.
- **iPhone / iPad:** open the site in Safari → *Share* → *Add to Home Screen*.
- Installation requires **HTTPS**. `localhost` is the only exception.

---

## Deploy

### Option A: one small server (VPS, Raspberry Pi, etc.) with Docker

```bash
cp .env.example .env           # fill in; set AUTH_URL=https://your-domain
docker compose up -d --build   # app on port 3000, MongoDB in a private container
```

Put a reverse proxy with HTTPS in front of port 3000. [Caddy](https://caddyserver.com) needs only one line:
`your-domain { reverse_proxy localhost:3000 }`. Then add the production origin and redirect URI to your Google OAuth client.

### Option B: cloud

The `Dockerfile` runs on any container platform, such as Google Cloud Run, Fly.io, Render, Railway, AWS App Runner, or Azure Container Apps.
You can also deploy to Vercel or Netlify without Docker. Use MongoDB Atlas for the database and set the same environment variables in the platform's dashboard.

---

## Not included yet (natural next steps)

- Push notifications for new messages or announcements. The PWA is ready for this; see the Next.js PWA guide
  (`node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`). It requires VAPID keys.
- Unread counts and real-time chat. Polling or Server-Sent Events can be added later.
- Automated tests.
