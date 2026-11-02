# Deploying AndThen

AndThen is a static app: the build is a folder of HTML, JS, CSS and icons, and all data stays in the browser. It runs on **Railway** as a small container that serves those files with [Caddy](https://caddyserver.com). The domain and DNS live in **Cloudflare**.

Railway builds and deploys on every push to `main`.

## What's in the repo

| File | Purpose |
| --- | --- |
| `Dockerfile` | Two stages: Node 22 runs `npm ci` and `npm run build`, then a Caddy image serves `apps/web/dist/web/browser`. |
| `Caddyfile` | Listens on Railway's `$PORT`. Deep links like `/routines` get `index.html` so the Angular router takes over. Hashed build files (`main-*.js`, `styles-*.css`, …) are cached for a year; everything else, including `index.html` and the service worker files, is `no-cache` so updates reach people on their next visit. Also gzip/zstd and a few basic security headers. |
| `railway.json` | Tells Railway to build with the Dockerfile and health-check `/`. |
| `.dockerignore` | Keeps `node_modules`, `dist` and git history out of the build. |

To try the production container locally (needs Docker):

```bash
docker build -t andthen .
docker run --rm -p 8080:8080 andthen   # http://localhost:8080
```

## One-time setup in Railway

1. In Railway, **New Project → Deploy from GitHub repo → jtpoltorak/andthen**.
2. Railway picks up `railway.json` and builds with the Dockerfile. No variables are needed (Railway sets `PORT` itself).
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

## Troubleshooting

- **Build fails at `npm ci`:** make sure `package-lock.json` is committed and up to date (`npm install` locally, then commit).
- **Old version still showing after a deploy:** the service worker updates in the background. Close all AndThen tabs (or the installed app) and reopen it.
- **Too many redirects on the custom domain:** Cloudflare SSL/TLS mode is set to Flexible; change it to Full.
