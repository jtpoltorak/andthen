# Deploying AndThen

AndThen is a static app: the build is a folder of HTML, JS, CSS and icons, and all data stays in the browser. It runs on **Railway** as a small container that serves those files with [Caddy](https://caddyserver.com). The domain and DNS live in **Cloudflare**.

Railway builds and deploys on every push to `main`.

## What's in the repo

| File            | Purpose                                                                                                                                                                                                                                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Dockerfile`    | Two stages: Node 22 runs `npm ci` and `npm run build`, then a Caddy image serves `apps/web/dist/web/browser`.                                                                                                                                                                                                                                                             |
| `Caddyfile`     | Listens on Railway's `$PORT`. Deep links like `/routines` get `index.html` so the Angular router takes over. Hashed build files (`main-*.js`, `styles-*.css`, …) are cached for a year; everything else, including `index.html` and the service worker files, is `no-cache` so updates reach people on their next visit. Also gzip/zstd and a few basic security headers. |
| `railway.json`  | Tells Railway to build with the Dockerfile, start Caddy, and health-check `/`. The start command is set here on purpose: Railway detects the npm workspaces and otherwise fills in an `npm` start command, which fails because the final image only contains Caddy.                                                                                                       |
| `.dockerignore` | Keeps `node_modules`, `dist` and git history out of the build.                                                                                                                                                                                                                                                                                                            |

To try the production container locally (needs Docker):

```bash
docker build -t andthen .
docker run --rm -p 8080:8080 andthen   # http://localhost:8080
```

## One-time setup in Railway

1. In Railway, **New Project → Deploy from GitHub repo → jtpoltorak/andthen**.
2. Railway picks up `railway.json` and builds with the Dockerfile. Railway has deprecated `railway.json` (it stops working on 2026-12-01), so also set **Settings → Deploy → Healthcheck Path** to `/` in the dashboard; the start command below is already a dashboard setting. No variables are needed (Railway sets `PORT` itself).
   - Railway may notice the npm workspaces and offer (or create) one service per package, such as `@andthen/web` and `@andthen/core`. You only need **one** service: delete any extra ones, and in the one you keep make sure **Settings → Source → Root Directory** is empty or `/` (the Dockerfile builds the whole repo).
   - Railway's npm detection also fills in dashboard settings that fight the Dockerfile. Fix them in the service **Settings**:
     - **Deploy → Custom Start Command:** set it to `caddy run --config /etc/caddy/Caddyfile --adapter caddyfile`. (In practice the dashboard value won over `railway.json`, and clearing it didn't stick.)
     - **Build → Custom Build Command:** clear it. The Dockerfile does the build.
     - **Build → Watch Paths:** remove `/apps/web/**`. Otherwise changes outside `apps/web` (such as `packages/core`, the Dockerfile, or `railway.json`) don't deploy.
3. In the service's **Settings**, confirm **Source → Branch** is `main` so pushes to `main` deploy.
4. **Settings → Networking → Generate Domain** gives a `*.up.railway.app` address. Open it on your phone and check: the app loads, a deep link like `/progress` loads, and "Add to Home Screen" / "Install app" is offered.

Cost: Railway's Hobby plan applies. A Caddy container serving static files uses very little memory and CPU, so it should stay well within the plan's included usage.

## Adding the custom domain (Cloudflare DNS)

1. Buy the domain in Cloudflare (**Domain Registration → Register Domains**). It becomes a zone in your account automatically.
2. In Railway: **Settings → Networking → Custom Domain**, enter the domain (for example `andthenhabits.com`). Railway shows a **CNAME target** (something like `abc123.up.railway.app`) and may also show a **TXT** verification record.
3. In Cloudflare, open the domain → **DNS → Records** and add:
   - `CNAME` · name `@` · target = the Railway CNAME target. Cloudflare flattens a CNAME on the bare domain automatically, so this works for the root.
   - The `TXT` record exactly as Railway shows it, if it shows one.
   - Proxy status: either works. Proxied (orange cloud) adds Cloudflare's CDN in front, which suits a static app.
4. If proxied, set the domain's **SSL/TLS → Overview** mode to **Full**, so Cloudflare talks to Railway over HTTPS. "Flexible" causes redirect loops.
5. Optional `www`: add the same `CNAME` with name `www` and add `www.<domain>` in Railway too, or add a Cloudflare **Rules → Redirect Rules** entry that sends `www` to the bare domain.
6. Wait for Railway to show the domain as active (usually a few minutes), then open it.

Each domain is its own browser origin: data saved on the `up.railway.app` address does **not** carry over to the custom domain. Use **Settings → Your data → Back up** on the old address and restore on the new one if you've been using it for real.

## The sync API (optional sync)

Sync is optional: the web app above works on its own. The sync server is a second Railway service, `api`, with a Postgres database next to it. Both live in the same Railway project as the web service.

| File                  | Purpose                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `apps/api/Dockerfile` | Bundles the API (and `packages/core`) into `dist/` with esbuild, then runs it on a plain Node 22 image.          |
| `apps/api/drizzle/`   | The SQL migrations. `npm run db:generate -w @andthen/api` writes a new one after a change to `src/db/schema.ts`. |

### One-time setup

1. **Add the database.** In the Railway project, **Create → Database → Add PostgreSQL**. Railway names it `Postgres` and gives it a `DATABASE_URL` variable.
2. **Add the api service.** **Create → GitHub Repo → jtpoltorak/andthen**. Rename the new service to `api`.
3. In the `api` service's **Settings**:
   - **Source → Root Directory:** leave empty (the Dockerfile builds from the repo root).
   - **Build → Dockerfile Path:** `/apps/api/Dockerfile` (press Enter or ✓ so it saves). This is what makes the service build the API instead of the web app. Also add the variable `RAILWAY_DOCKERFILE_PATH` = `apps/api/Dockerfile` (step 4), which Railway honours even if the field doesn't stick. The build log should say `load build definition from apps/api/Dockerfile`; if it mentions `caddy`, it's building the web app.
   - **Build → Watch Paths:** `/apps/api/**`, `/packages/core/**` and `/package-lock.json`, so the API only redeploys when it changes.
   - **Deploy → Pre-deploy step:** `node dist/migrate.js`. It brings the database up to date before each deploy, and a failed migration stops the deploy before new code takes traffic.
   - **Deploy → Healthcheck Path:** `/health`.
   - **Config-as-code:** leave empty. Railway has deprecated config files (`railway.json`), and a service that never used one can't opt in.
   - **Build → Custom Build Command** and **Deploy → Custom Start Command:** leave empty, and clear them if Railway filled them in. The Dockerfile builds and starts the API.
4. In the `api` service's **Variables**, add:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (a reference: pick it from the dropdown). It uses Railway's private network, so the database is never exposed to the internet.
   - `APP_ORIGIN` = `https://andthenhabits.com`
   - `RAILWAY_DOCKERFILE_PATH` = `apps/api/Dockerfile`
   - `RESEND_API_KEY` = your Resend API key (see "Sign-in emails" below). Until it's set, the API runs but sign-in answers "not set up yet".
5. **Deploy.** The deploy log should show `Database is up to date.` from the pre-deploy step, then the server listening.
6. **Domain.** **Settings → Networking → Custom Domain** → `api.andthenhabits.com`. If Railway asks for a port, use the one in the deploy log's `Server listening at http://0.0.0.0:…` line (usually `8080`). Railway sets `PORT` for the service and the API listens on it, so don't add a `PORT` variable yourself. In Cloudflare **DNS → Records**, add a `CNAME` named `api` pointing at the target Railway shows (plus its `TXT` record, if any), proxied, the same as the root domain.
7. **Check it:** <https://api.andthenhabits.com/health> should show `{"ok":true}`.

**Watch the web service too.** Adding `apps/api` changes the shared lockfile, so the web service redeploys on the same merge. That's expected.

**Backups.** Check whether your Railway plan includes scheduled backups for the Postgres volume (**Postgres service → Backups**). If it does, turn on daily backups before sync goes live.

### Sign-in emails (Resend)

Sign-in codes are emailed through [Resend](https://resend.com) from `hello@andthenhabits.com`. That address only sends; it needs no inbox.

1. Create a free Resend account and choose **Domains → Add Domain** → `andthenhabits.com`.
2. Resend lists a few DNS records (an MX and TXT for a `send` subdomain, and a DKIM `TXT`). Add each in Cloudflare **DNS → Records** exactly as shown, with proxy **off** (grey cloud): email records can't be proxied.
3. Back in Resend, click **Verify**. It usually turns green within minutes.
4. **API Keys → Create API Key** with "Sending access" only. Copy it straight into the `api` service's `RESEND_API_KEY` variable in Railway. Don't save it anywhere else.
5. Test it: sign in from the app (once sync is in the app) or run
   `curl -X POST https://api.andthenhabits.com/v1/auth/email/start -H 'Content-Type: application/json' -d '{"email":"you@example.com"}'`
   and check your inbox (and spam folder, the first time).

### Running the API locally

You need a Postgres. With Docker:

```bash
docker run -d --name andthen-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=andthen -p 5432:5432 postgres:16
cp apps/api/.env.example apps/api/.env
npm run build:api && npm run db:migrate -w @andthen/api
npm run start:api          # http://localhost:3000/health
                           # sign-in codes are printed here instead of emailed
```

The API tests don't need any of that: they run against PGlite, a real Postgres compiled to WebAssembly, inside the test process.

## Troubleshooting

- **Build fails at `npm ci`:** make sure `package-lock.json` is committed and up to date (`npm install` locally, then commit).
- **Old version still showing after a deploy:** the service worker updates in the background. Close all AndThen tabs (or the installed app) and reopen it.
- **Deploy fails with "The executable `npm` could not be found":** a start command from Railway's npm detection is being used instead of Caddy's. Set **Settings → Deploy → Custom Start Command** to `caddy run --config /etc/caddy/Caddyfile --adapter caddyfile`, then redeploy.
- **A merge to `main` didn't deploy:** check **Settings → Build → Watch Paths**. Use **Deployments → ⋮ → Deploy latest commit** to deploy by hand.
- **The api deploy fails in the pre-deploy step:** a migration failed, and the previous version keeps running. The deploy log shows the SQL error. Check that `DATABASE_URL` is set as a reference to the Postgres service.
- **Sign-in answers 503 `email_not_set_up`:** `RESEND_API_KEY` isn't set on the `api` service. `email_failed` means Resend refused: the deploy log shows why (often an unverified domain).
- **`api.andthenhabits.com/health` shows the web app, and the api deploy log mentions Caddy:** the api service built the web app's Dockerfile. Set **Build → Dockerfile Path** to `/apps/api/Dockerfile`, clear any `caddy` start command, and redeploy.
- **`/health` answers 503:** the API is up but can't reach Postgres. Check the `DATABASE_URL` reference and that the Postgres service is running.
- **Too many redirects on the custom domain:** Cloudflare SSL/TLS mode is set to Flexible; change it to Full.
