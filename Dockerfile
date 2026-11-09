# AndThen is a static app: build it with Node, then serve the files with Caddy.
# Railway builds this automatically on every push to main.

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/data/package.json packages/data/
COPY apps/web/package.json apps/web/
COPY apps/extension/package.json apps/extension/
COPY apps/api/package.json apps/api/
RUN npm ci --no-audit --no-fund
COPY . .
# Railway passes the commit being deployed; the About card shows its short form.
ARG RAILWAY_GIT_COMMIT_SHA
RUN npm run build

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/dist/web/browser /srv
# Open-source notices for the bundled libraries, linked from Settings → About and the Terms.
COPY --from=build /app/apps/web/dist/web/3rdpartylicenses.txt /srv/
