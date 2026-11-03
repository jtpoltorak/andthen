# The AndThen sync API. Built from the repo root (Railway's default), because it
# bundles @andthen/core from packages/core.
# On Railway, the api service points at this file with Settings → Build →
# Dockerfile Path = /apps/api/Dockerfile. Keep the repo root free of a
# railway.json: Railway applies it to every service and would override that.

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
RUN npm ci --no-audit --no-fund -w @andthen/api -w @andthen/core
COPY packages/core packages/core
COPY apps/api apps/api
RUN npm run build -w @andthen/api

# The bundle has every dependency inlined, so the runtime image is just Node,
# the bundle and the SQL migrations.
FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/drizzle ./drizzle
USER node
CMD ["node", "--enable-source-maps", "dist/main.js"]
