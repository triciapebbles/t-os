# House Management

A private household dashboard: Google sign-in (gated to an allow-list),
a weekly schedule pulled from Google Calendar, and a chores list (seeded
from the household's `Dailies.xlsx`) that anyone signed in can add to,
edit, assign, and delete.

**Stack:** Next.js 14 (App Router) + TypeScript, Auth.js/NextAuth (Google
OAuth), Prisma ORM, Postgres on [Neon](https://neon.tech), hosted on
[Render](https://render.com), code on GitHub.

---

## 1. Push the code to GitHub

1. Unzip this project locally.
2. Create a new **empty** repository on GitHub (no README/license, so
   there's nothing to conflict with) — e.g. `house-management`.
3. From inside the unzipped folder:

   ```bash
   git init
   git add .
   git commit -m "Initial commit: House Management dashboard"
   git branch -M main
   git remote add origin https://github.com/<your-username>/house-management.git
   git push -u origin main
   ```

---

## 2. Create the database on Neon

1. Sign in at [neon.tech](https://neon.tech) and click **New Project**.
2. Name it (e.g. `house-management`), pick a region close to your Render
   region, and create it. Neon creates a default database for you.
3. On the project's **Dashboard → Connection Details**, copy:
   - The **pooled** connection string (has `-pooler` in the hostname) →
     this is your `DATABASE_URL`.
   - The **direct** connection string (no `-pooler`) → this is your
     `DIRECT_URL` (Prisma migrations need a direct, non-pooled
     connection).
   - Make sure `?sslmode=require` is on the end of both (Neon includes
     this by default).

Keep this tab open — you'll paste both strings into Render in step 5.

---

## 3. Create a Google OAuth client (for login + Calendar access)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
   and create a new project (or reuse one you already have).
2. **APIs & Services → Enabled APIs → Enable APIs and services** → enable
   the **Google Calendar API**.
3. **APIs & Services → OAuth consent screen**:
   - User type: **External** (unless you have Google Workspace and want
     Internal).
   - Fill in the app name (e.g. "House Management"), your email, etc.
   - Scopes: add `.../auth/calendar.readonly` (and the default
     `email`/`profile`/`openid` scopes).
   - Under **Test users** (while the app is in "Testing" publishing
     status), add every Google account that should be able to log in —
     this must match `ALLOWED_USERS` in step 5. While the consent screen
     is in "Testing" mode, only listed test users can complete sign-in
     at all, on top of the app's own `ALLOWED_USERS` check.
4. **APIs & Services → Credentials → Create Credentials → OAuth client
   ID**:
   - Application type: **Web application**.
   - Authorized redirect URIs: add
     `https://<your-render-service>.onrender.com/api/auth/callback/google`
     (you'll know the exact Render URL after step 4 — you can create the
     Render service first, then come back and add this, or use the
     service name you plan to give it).
   - Save, then copy the **Client ID** and **Client secret**.

---

## 4. Create the web service on Render

1. Sign in at [render.com](https://render.com) → **New +** → **Web
   Service**.
2. Connect your GitHub account and pick the `house-management` repo.
3. Configure:
   - **Name:** `house-management` (this becomes part of your URL:
     `https://house-management.onrender.com`).
   - **Runtime:** Node.
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Instance type:** Starter is enough for a household dashboard.
4. Don't click "Create Web Service" yet — add the environment variables
   first (next step), or add them right after creation from the
   **Environment** tab. Either order works; the first deploy will fail
   until they're all set, and Render will let you redeploy once they
   are.

(Alternatively: this repo includes a `render.yaml` Blueprint. In Render,
choose **New + → Blueprint** and point it at the repo to create the
service with these settings pre-filled — you'll still need to fill in
the secret values by hand.)

---

## 5. Set environment variables on Render

On the service's **Environment** tab, add:

| Key | Value |
|---|---|
| `DATABASE_URL` | Pooled connection string from Neon (step 2) |
| `DIRECT_URL` | Direct connection string from Neon (step 2) |
| `NEXTAUTH_URL` | `https://<your-render-service>.onrender.com` |
| `NEXTAUTH_SECRET` | A random secret — generate with `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | From step 3 |
| `GOOGLE_CLIENT_SECRET` | From step 3 |
| `ALLOWED_USERS` | Comma-separated Google emails allowed to log in, e.g. `you@gmail.com,partner@gmail.com` |
| `NODE_VERSION` | `20.17.0` (or any Node 20.x) |

Save, and Render will trigger a deploy. If you created the OAuth client
before knowing the final Render URL, go back to Google Cloud Console now
and make sure the redirect URI matches exactly:
`https://<your-render-service>.onrender.com/api/auth/callback/google`.

---

## 6. Run migrations (and optionally seed starter chores)

The `build` script (`prisma generate && prisma migrate deploy && next
build`) automatically applies Prisma migrations on every deploy, so a
normal deploy is enough to create the database tables — **but this repo
ships without a migrations folder** (so it doesn't assume a particular
Prisma version's migration format). Generate one once, from your own
machine, before the first deploy:

```bash
npm install
# Point at your Neon DIRECT_URL for this one-off step:
DATABASE_URL="<your Neon DIRECT_URL>" npx prisma migrate dev --name init
git add prisma/migrations
git commit -m "Add initial Prisma migration"
git push
```

Then, to load the starter chores list (from the household's
`Dailies.xlsx`) and the two default household members (Tricia, Zane):

```bash
DATABASE_URL="<your Neon DIRECT_URL>" npm run db:seed
```

You only need to do this once — after that, everyone manages chores
from the dashboard itself. Seeding is optional; skip it if you'd rather
start with an empty chores list and add your own from the UI.

---

## 7. Try it

Visit `https://<your-render-service>.onrender.com`, sign in with an
allow-listed Google account, and grant calendar access when prompted.
You should land on the dashboard with links to the weekly schedule and
chores list.

### Notes & troubleshooting

- **"This Google account isn't on the household's allowed list"** — the
  email isn't in `ALLOWED_USERS` on Render (comma-separated, no spaces
  needed but they're trimmed if present), or the OAuth consent screen's
  Test Users list (step 3) doesn't include it.
- **Calendar events don't show up** — the account signed in before
  `calendar.readonly` was added as a scope, or declined the calendar
  permission. Sign out and sign back in; Google will re-prompt for
  consent.
- **Cold starts:** Render's free/starter tier spins the service down
  after inactivity, so the first request after a while can take ~30s.
- **Local development:** copy `.env.example` to `.env`, point
  `DATABASE_URL`/`DIRECT_URL` at Neon (or a local Postgres), set
  `NEXTAUTH_URL=http://localhost:3000`, add
  `http://localhost:3000/api/auth/callback/google` as an extra
  authorized redirect URI in Google Cloud Console, then:

  ```bash
  npm install
  npx prisma migrate dev --name init
  npm run db:seed   # optional
  npm run dev
  ```

---

## What's implemented

- **Login:** Google OAuth via NextAuth; only emails listed in
  `ALLOWED_USERS` can complete sign-in (checked in the `signIn`
  callback). Every page and API route is gated behind a signed-in
  session via middleware.
- **Weekly schedule:** reads the signed-in user's **primary** Google
  Calendar for the current week (Mon–Sun), with Prev/Next week
  navigation. Calendar read permission is requested as part of the
  Google sign-in consent screen.
- **Chores:** add/edit/delete, grouped by category (categories are
  free-form — create a new one inline when adding a chore), each with a
  duration (minutes) and one or more assignees (household members, kept
  separate from login accounts so you can assign chores to people who
  don't need a login). Seeded from the `BAU - CHORES` tab of
  `Dailies.xlsx`; the "today's fit" and cat-feeding tabs were
  intentionally left out, per the source sheet.

## Project structure

```
prisma/schema.prisma   Database schema (Users/Accounts for auth, Person,
                        Category, Chore, ChoreAssignee)
prisma/seed.ts          Seeds starter categories/people/chores
src/lib/auth.ts          NextAuth config (Google provider, allow-list check)
src/lib/googleCalendar.ts  Google Calendar API client w/ token refresh
src/middleware.ts        Gates all pages/APIs behind login
src/app/login            Sign-in page
src/app/schedule         Weekly schedule view
src/app/chores           Chores list + add/edit/delete UI
src/app/api/...          REST endpoints backing the above
```
