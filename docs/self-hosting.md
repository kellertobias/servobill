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
| DynamoDB | PostgreSQL | `POSTGRES_URL` |
| S3 | Local volume **or** any S3-compatible storage (MinIO, Garage, AWS S3, …) | `UPLOAD_DIRECTORY` **or** `BUCKET_FILES`, `ENDPOINT_S3`, `S3_PUBLIC_ENDPOINT`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |
| SES | Any SMTP server, see [Email](#email-smtp) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_FROM_NAME` |
| Google sign in / users | Local users, Google, or any OIDC provider | see [Authentication & Users](authentication.md) |

## Images

One multi-stage `Dockerfile` builds both images:

```bash
docker build --target app     -t servobill-app .
docker build --target workers -t servobill-workers .
```

Released images are published as `ghcr.io/kellertobias/servobill/app` and
`ghcr.io/kellertobias/servobill/workers` (tags `latest`, `vX` and `vX.Y.Z`).
Both run as the unprivileged user `node` (uid 1000) and have health checks
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

## Email (SMTP)

Self-hosted installs send invoices, offers, reminders and reports through any
SMTP server: your mail provider, a transactional service (Postmark, Mailgun,
Brevo, Amazon SES SMTP, …) or a relay in your network. Setting `SMTP_HOST`
switches from SES to SMTP.

| Variable | Default | Meaning |
|---|---|---|
| `SMTP_HOST` | – | Mail server |
| `SMTP_PORT` | `587` | `587` (STARTTLS), `465` (TLS) or `25` |
| `SMTP_USER`, `SMTP_PASSWORD` | – | Login; leave `SMTP_USER` empty for relays without authentication |
| `SMTP_FROM` | – | Sender address used when none is configured in the settings |
| `SMTP_FROM_NAME` | – | Display name for `SMTP_FROM` |
| `SMTP_ENFORCE_FROM` | `false` | Always send from `SMTP_FROM`; the sender from the settings becomes the Reply-To. Use this when the provider only accepts verified sender addresses. |
| `SMTP_SECURE` | `true` for port 465 | Use TLS from the start |
| `SMTP_REQUIRE_TLS` | `false` | Refuse to send when the server does not offer STARTTLS |
| `SMTP_TLS_REJECT_UNAUTHORIZED` | `true` | Set to `false` for internal servers with self-signed certificates |

**Testing the setup:** Settings → E-Mail Sending → *Send test email*. The
page shows the server's answer, for example a rejected login or an
unreachable host. For trying things out locally, [Mailpit](https://mailpit.axllent.org)
(`SMTP_HOST=mailpit`, `SMTP_PORT=1025`, no login) catches all messages.

## Operational notes

- **Single workers replica.** The event queue is a SQLite file, so run exactly
  one workers container. The app can be scaled when files are stored in
  S3/MinIO (or on a ReadWriteMany volume).
- **Backups.** Back up the Postgres database and the file storage (data volume
  or bucket). The built-in email backup feature works in containers too.
- **Reverse proxy.** Terminate TLS in front of the app (Traefik, Caddy, nginx,
  an Ingress) and forward the `Host` and `X-Forwarded-Proto` headers, or set
  `PUBLIC_URL`.
- **Sign-in rate limiting.** After 10 wrong passwords an account's password
  sign in is locked for 15 minutes (stored in the database, so it holds across
  containers). For internet-facing instances add per-IP rate limiting in your
  proxy as well.
