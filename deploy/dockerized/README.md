# Docker Compose deployment

Runs Servobill on a single host with Docker Compose:

| Service | Replaces (serverless) |
|---|---|
| `app` | CloudFront, API Gateway, API Lambdas |
| `workers` | EventBridge, event handler Lambdas, cron, PDF rendering |
| `postgres` | DynamoDB |
| data volume (`/data`) | S3 (or use S3/MinIO, see below) |
| your SMTP server | SES |

See [docs/self-hosting.md](../../docs/self-hosting.md) for all options.

## Quick start

```bash
cd deploy/dockerized
cp env.example .env
# edit .env: DB_PASSWORD, JWT_SECRET, PUBLIC_URL, SMTP_*, sign in settings
docker compose up -d --build
```

The app is now available on port `HTTP_PORT` (default 3000). With the defaults
from `env.example` you sign in with `INITIAL_ADMIN_EMAIL` /
`INITIAL_ADMIN_PASSWORD`. Change the password under *My Account* afterwards and
remove `INITIAL_ADMIN_PASSWORD` from `.env`.

### Pre-built images

Instead of building, pull the published images:

```bash
docker compose pull
docker compose up -d
```

Only `docker-compose.release.yml` and `env.example` are needed for this: they
are attached to every release and work without a checkout of the repository
(`docker compose -f docker-compose.release.yml up -d`).
Pin a version with `SERVOBILL_VERSION=v1.17.0` in `.env`.

## TLS / reverse proxy

Put a reverse proxy (Traefik, Caddy, nginx, …) in front of the `app` service
for TLS and forward `Host` and `X-Forwarded-Proto`, or set `PUBLIC_URL`.
For plain HTTP in a trusted LAN set `PUBLIC_URL=http://<host>:3000` and
`INSECURE_COOKIES=true`.

## File storage

By default attachments and generated PDFs are stored in the `servobill-data`
volume, shared by `app` and `workers` (`UPLOAD_DIRECTORY=/data/files`). To use
an S3-compatible storage instead, set in `.env`:

```bash
UPLOAD_DIRECTORY=
BUCKET_FILES=servobill
ENDPOINT_S3=http://minio:9000           # internal address
S3_PUBLIC_ENDPOINT=https://s3.example.com  # address browsers use
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## Operations

```bash
docker compose ps                 # status (both containers have health checks)
docker compose logs -f app        # logs
docker compose pull && docker compose up -d   # update
docker compose down               # stop (keeps data)
```

The `backup` service backs up the database and files every night (02:30 by
default) into the `servobill-backups` volume and can restore them:

```bash
docker compose exec backup servobill-backup run    # back up now
docker compose exec backup servobill-backup list
```

See [docs/backup.md](../../docs/backup.md) for restoring and offsite copies.

## Upgrading from the previous compose files

- `App.Dockerfile` / `BackgroundJobs.Dockerfile`, `docker-compose.prod.yml`
  and `deploy.sh` were replaced by `Dockerfile` and the two compose files here.
- The host port variable is now `HTTP_PORT` (was `PORT`).
- Containers run as uid 1000. The data now lives in the named volume
  `servobill-data`. To keep using the old `./data` folder, set
  `DATA_VOLUME=./data`, move the files to `./data/files`, and run
  `sudo chown -R 1000:1000 ./data`.
- Database user, password variable (`DB_PASSWORD`) and database name are
  unchanged, so the existing `postgres-data` volume keeps working.
