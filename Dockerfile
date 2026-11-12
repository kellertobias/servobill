# syntax=docker/dockerfile:1
#
# Container images for the self-hosted deployment (Docker Compose / Kubernetes).
#
#   docker build --target app     -t servobill-app .
#   docker build --target workers -t servobill-workers .
#   docker build --target backup  -t servobill-backup .
#
# The serverless deployment (AWS/SST) does not use these images.

ARG NODE_IMAGE=node:22-alpine
# Must match the Postgres server version (backup image only)
ARG POSTGRES_VERSION=15

# ---------------------------------------------------------------------------
# Dependencies (including dev dependencies needed for the build and tsx)
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
# Toolchain for native modules (sqlite3) on architectures without prebuilds
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------------------------------------------------------------------------
# Build: API index, GraphQL types and the Next.js app
# ---------------------------------------------------------------------------
FROM deps AS build
ENV NEXT_TELEMETRY_DISABLED=1 NOT_SERVERLESS=true
COPY tsconfig.base.json tsconfig.json tsconfig.next.json next.config.js \
     postcss.config.js tailwind.config.ts codegen.ts ./
COPY public ./public
COPY stack/build-index ./stack/build-index
COPY stack/local/queue ./stack/local/queue
COPY src ./src
RUN npx tsx stack/build-index/index.ts \
 && npm run gql:type \
 && npm run build \
 && rm -rf .next/cache

# Production dependencies only, for the web image
FROM build AS prod-deps
RUN npm prune --omit=dev --no-audit --no-fund

# ---------------------------------------------------------------------------
# Web app: UI and API (replaces CloudFront, API Gateway and API Lambdas)
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS app
ENV NODE_ENV=production \
    NOT_SERVERLESS=true \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/next.config.js ./
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node_modules/.bin/next", "start"]

# ---------------------------------------------------------------------------
# Workers: event bus, event handlers, PDF rendering and cron
# (replaces EventBridge, the event handler Lambdas and the scheduled cron)
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS workers
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates \
    ttf-freefont font-noto
ENV NODE_ENV=production \
    NOT_SERVERLESS=true \
    CHROME_PATH=/usr/bin/chromium-browser \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PORT=9326 \
    EVENT_QUEUE_DB=/data/event-queue.db
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/tsconfig.base.json /app/tsconfig.json ./
COPY --from=build /app/src/backend ./src/backend
COPY --from=build /app/src/common ./src/common
COPY --from=build /app/stack/local/queue ./stack/local/queue
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 9326
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:9326/health >/dev/null || exit 1
CMD ["node_modules/.bin/tsx", "stack/local/queue/index.ts"]

# ---------------------------------------------------------------------------
# Backups: scheduled database dumps and file archives with restore
# (replaces DynamoDB point-in-time recovery and S3 versioning).
# The Postgres major version must match the database server.
# ---------------------------------------------------------------------------
FROM postgres:${POSTGRES_VERSION}-alpine AS backup
RUN apk add --no-cache rclone sqlite tzdata
COPY --chmod=755 deploy/backup/servobill-backup.sh /usr/local/bin/servobill-backup
# Same uid as the app, so the data volume can be read and restored
RUN mkdir -p /backups /data && chown 1000:1000 /backups /data
ENV BACKUP_DIR=/backups \
    DATA_DIR=/data \
    RCLONE_CONFIG=/tmp/rclone.conf
USER 1000:1000
HEALTHCHECK --interval=1h --timeout=10s --start-period=1m \
  CMD servobill-backup health
ENTRYPOINT ["servobill-backup"]
CMD ["schedule"]
