# Self-hosting (Docker, Docker Compose, Kubernetes)

Servobill runs either **serverless on AWS** (SST, see
[deploy/serverless](../deploy/serverless/README.md)) or **self-hosted in
containers**. Both deployments run the same code; every AWS service has a
container replacement:

| Serverless (AWS) | Self-hosted | Configuration |
|---|---|---|
| CloudFront + Next.js Lambda | `app` container (`Dockerfile`, target `app`) | `PUBLIC_URL`, `INSECURE_COOKIES` |
| API Gateway + API Lambdas | `app` container (`/api/*` routes) | – |
| EventBridge | `workers` container (HTTP event bus on port 9326, persistent SQLite queue) | `ENDPOINT_EVENTBRIDGE=http://<workers>:9326`, `EVENT_QUEUE_DB` |
| Event handler Lambdas (PDF, email, receipts, reports, backups) | `workers` container (incl. Chromium) | – |
| Scheduled cron (every 30 min) | `workers` container (cron event every 5 min) | – |
| DynamoDB | PostgreSQL **or** SQLite (single host) | `POSTGRES_URL` **or** `SQLITE_PATH` |
| S3 | Local volume **or** any S3-compatible storage (MinIO, Garage, AWS S3, …) | `UPLOAD_DIRECTORY` **or** `BUCKET_FILES`, `ENDPOINT_S3`, `S3_PUBLIC_ENDPOINT`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |
| SES | Any SMTP server | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_FROM_NAME` |
| DynamoDB point-in-time recovery, S3 versioning | `backup` container: daily database dump + file archive, retention, optional offsite copy | `BACKUP_TIME`, `BACKUP_RETENTION_DAYS`, `BACKUP_REMOTE`, see [Backups](backup.md) |
| Google sign in / users | Local users, Google, or any OIDC provider | see [Authentication & Users](authentication.md) |

## Images

One multi-stage `Dockerfile` builds all images:

```bash
docker build --target app     -t servobill-app .
docker build --target workers -t servobill-workers .
docker build --target backup  -t servobill-backup .
```

Released images are published as `ghcr.io/kellertobias/servobill/app`,
`ghcr.io/kellertobias/servobill/workers` and `ghcr.io/kellertobias/servobill/backup`
(tags `latest`, `vX` and `vX.Y.Z`). App and workers run as the unprivileged user `node` (uid 1000) and have health checks
(`/api/health` on port 3000, `/health` on port 9326).

## Environment variables

| Variable | Used by | Description |
|---|---|---|
| `POSTGRES_URL` | app, workers | `postgres://user:password@host:5432/db`. The schema is created and migrated automatically on start. |
| `JWT_SECRET` | app | Random secret for session cookies. |
| `PUBLIC_URL` | app | Public URL, e.g. `https://billing.example.com`. Used for sign-in redirects. Without it, the Host and `X-Forwarded-Proto` headers are used. |
| `INSECURE_COOKIES` | app | `true` only when the app is served over plain HTTP. |
| `ENDPOINT_EVENTBRIDGE` | app, workers | URL of the workers' event bus, e.g. `http://workers:9326`. |
| `EVENT_QUEUE_DB` | workers | SQLite file for queued events (default `/data/event-queue.db` in the image). Put it on a volume. |
| `UPLOAD_DIRECTORY` | app, workers | Store files in this directory. Must be **shared** between app and workers. |
| `BUCKET_FILES`, `ENDPOINT_S3`, `S3_PUBLIC_ENDPOINT` | app, workers | S3-compatible storage, used when `UPLOAD_DIRECTORY` is empty. `S3_PUBLIC_ENDPOINT` is the URL browsers use to download files (presigned URLs) when `ENDPOINT_S3` is an internal address. |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` | app, workers | Credentials for the S3-compatible storage. |
| `SMTP_*` | workers | Outgoing email. |
| `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL` | workers | Optional AI receipt import. |
| Authentication | app | `LOCAL_AUTH_ENABLED`, `INITIAL_ADMIN_*`, `ALLOWED_EMAILS`, `ADMIN_EMAILS`, `OAUTH_CLIENT_ID`, `OIDC_*`, see [authentication.md](authentication.md). |

`NEXT_PUBLIC_API_URL` is not needed: in containers, UI and API share one origin.

## Docker Compose

See [deploy/dockerized](../deploy/dockerized/README.md).

## Kubernetes

See [deploy/kubernetes](../deploy/kubernetes/README.md).

## SQLite instead of Postgres

For small single-host installs the database can be a SQLite file on the data
volume instead of a Postgres server. Set in `.env`:

```bash
SQLITE_PATH=/data/servobill.sqlite
```

`SQLITE_PATH` takes precedence over `POSTGRES_URL`, so the bundled `postgres`
service is then unused and can be removed from the compose file. App and
workers share the file through the data volume (SQLite runs in WAL mode). Do
not use SQLite on network file systems or in Kubernetes with several nodes;
use Postgres there.

There is no automatic migration between Postgres and SQLite; choose one when
setting up an installation.

## Operational notes

- **Single workers replica.** The event queue is a SQLite file, so run exactly
  one workers container. The app can be scaled when files are stored in
  S3/MinIO (or on a ReadWriteMany volume).
- **Backups.** The `backup` container / CronJob backs up the database and the
  files every night and can restore them, see [Backups](backup.md).
- **Reverse proxy.** Terminate TLS in front of the app (Traefik, Caddy, nginx,
  an Ingress) and forward the `Host` and `X-Forwarded-Proto` headers, or set
  `PUBLIC_URL`.
- **Sign-in rate limiting.** After 10 wrong passwords an account's password
  sign in is locked for 15 minutes (stored in the database, so it holds across
  containers). For internet-facing instances add per-IP rate limiting in your
  proxy as well.
