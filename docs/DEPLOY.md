# Deploying AndThen

AndThen is a static app: the build is a folder of HTML, JS, CSS and icons, and all data stays in the browser. It is hosted on **Cloudflare Workers (static assets)**, which serves those files from Cloudflare's network for free. No server code runs.

Cloudflare builds and deploys automatically:

- **Push to `main`** → a new production deploy.
- **Push to any other branch / open a PR** → a preview version with its own URL (production is untouched).

## What's in the repo

| File | Purpose |
| --- | --- |
| `wrangler.jsonc` | Cloudflare config: the Worker name (`andthen`), the build output folder, and SPA routing so deep links like `/routines` load the app. |
| `apps/web/public/_headers` | Response headers. Hashed build files (`main-*.js`, `styles-*.css`, …) are cached for a year; `index.html` and the service worker files keep Cloudflare's default "always revalidate", so updates reach people on their next visit. Also adds a few basic security headers. |
| `.node-version` | Tells the Cloudflare build to use Node 22. |

Local commands (from the repo root):

```bash
npm run preview   # production build served by Cloudflare's local runtime at http://localhost:8787
npm run deploy    # build and deploy from your machine (needs `npx wrangler login` once)
```

You normally won't need `npm run deploy`, since pushes to `main` deploy on their own.

## One-time setup in the Cloudflare dashboard

1. Go to **dash.cloudflare.com → Compute (Workers) → Workers & Pages → Create → Import a repository**.
2. Connect GitHub if asked, and pick **jtpoltorak/andthen**.
3. Fill in the build settings:
   - **Project name:** `andthen` (must match `name` in `wrangler.jsonc`)
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
   - **Non-production branch deploy command:** `npx wrangler versions upload` (this is what gives PRs preview URLs)
   - **Path / root directory:** leave as `/`
   - No environment variables or secrets are needed.
4. Click **Create and deploy**. The first build takes a couple of minutes. When it finishes, the app is live at `https://andthen.<your-subdomain>.workers.dev`.
5. Open that URL on your phone and check: the app loads, a deep link like `/progress` loads, and "Add to Home Screen" / "Install app" is offered.

## Adding the custom domain

1. Buy the domain in **Domain Registration → Register Domains**. A domain bought through Cloudflare is automatically set up as a zone in your account, so there is no DNS to configure by hand.
2. Open the **andthen** Worker → **Settings → Domains & Routes → Add → Custom domain**, and enter the bare domain (for example `andthenhabits.com`). Cloudflare creates the DNS record and the HTTPS certificate.
3. Optional: add `www.<domain>` the same way, or add a redirect rule (zone → **Rules → Redirect Rules**) that sends `www` to the bare domain.
4. Optional: in the Worker's **Settings → Domains & Routes**, turn off the `workers.dev` route once the custom domain works, so there is only one public address.

Note that each domain is its own browser origin: data saved on the `workers.dev` address does **not** carry over to the custom domain. Use **Settings → Your data → Back up** on the old address and restore on the new one if you've been using it for real.

## Troubleshooting

- **Build fails at `npm ci`:** make sure `package-lock.json` is committed and up to date (`npm install` locally, then commit).
- **Old version still showing after a deploy:** the service worker updates in the background. Close all AndThen tabs (or the installed app) and reopen it.
- **Deep link returns 404:** check `not_found_handling` is still `single-page-application` in `wrangler.jsonc`.
