# Deploying DAYFILM — Vercel + Supabase

The codebase is deploy-ready (`npm run build` passes; uploads go direct to
storage; auth is required in prod). What remains is account setup — roughly
30 minutes, one time.

## 1. Push to GitHub

```bash
gh auth login                  # authenticate the GitHub CLI (browser flow)
gh repo create dayfilm --private --source=. --push
```

(Or create an empty private repo on github.com and
`git remote add origin <url> && git push -u origin main`.)

## 2. Supabase (database + file storage)

1. Sign up at https://supabase.com (free, sign in with GitHub is easiest).
2. **New project** → name `dayfilm`, pick the region closest to you, set a
   strong database password and save it.
3. **Storage** (left sidebar) → **New bucket** → name `media`,
   **Private** (do NOT make it public). Nothing else to configure.
4. **Project Settings → Data API**: copy the **Project URL**
   (`https://<ref>.supabase.co`) → this is `SUPABASE_URL`.
5. **Project Settings → API keys**: copy the **service_role** key (secret!)
   → this is `SUPABASE_SERVICE_KEY`. Never expose it client-side.
6. **Connect** (top bar) → **ORMs / Prisma** → copy the **Session pooler**
   connection string (port 5432) → this is the production `DATABASE_URL`.
   Replace `[YOUR-PASSWORD]` with the database password from step 2
   (URL-encode special characters, e.g. `@` → `%40`).
7. Create the tables — run locally, pointing at Supabase:

   ```bash
   DATABASE_URL="<the session pooler url>" npx prisma migrate deploy
   ```

## 3. Google OAuth (required in production — dev login is disabled there)

1. https://console.cloud.google.com/apis/credentials → create a project.
2. Configure the OAuth consent screen (External, app name DAYFILM, your email;
   no scopes beyond the defaults; add yourself as a test user).
3. **Create credentials → OAuth client ID** → type **Web application**:
   - Authorized redirect URIs — add BOTH:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://<your-app>.vercel.app/api/auth/callback/google`
       (add this after Vercel assigns the domain in step 4 — come back here)
4. Copy the Client ID and Client Secret.
5. For local Google sign-in too: fill `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
   in `.env` and restart the dev server.

## 4. Vercel (hosting, wired to GitHub)

1. Sign up at https://vercel.com **with your GitHub account**.
2. **Add New → Project** → import the `dayfilm` repo. Framework auto-detects
   as Next.js; leave build settings alone.
3. Before the first deploy, add **Environment Variables** (Production):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Supabase session-pooler string (step 2.6) |
   | `STORAGE_DRIVER` | `supabase` |
   | `SUPABASE_URL` | step 2.4 |
   | `SUPABASE_SERVICE_KEY` | step 2.5 |
   | `SUPABASE_BUCKET` | `media` |
   | `AUTH_SECRET` | fresh secret: `openssl rand -base64 32` (do not reuse dev's) |
   | `GOOGLE_CLIENT_ID` | step 3.4 |
   | `GOOGLE_CLIENT_SECRET` | step 3.4 |

4. **Deploy.** Vercel gives you `https://<app>.vercel.app` — go back to
   Google (step 3.3) and add the production redirect URI.
5. Git integration is automatic from now on: **every `git push` to `main`
   deploys to production**; pushes to other branches get preview URLs.

## 5. Smoke test

Sign in with Google on the production URL (films recorded locally stay on
your laptop — local and prod storage are separate worlds), record a take,
finalize, share. Watch storage usage in Supabase → Storage.

## Notes

- Free-tier ceilings: Supabase 500MB DB / 1GB storage, Vercel 100GB bandwidth.
  The in-app storage meter tracks the 1GB.
- `ffmpeg-core` is copied into `public/` by the `postinstall` script, so
  Vercel builds include it automatically.
- Prisma migrations: after schema changes, run
  `DATABASE_URL=<supabase> npx prisma migrate deploy` before pushing code
  that depends on them.
