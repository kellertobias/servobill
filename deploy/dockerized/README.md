# Dockerized Deployment for Servobill

**WARNING: This is a work in progress and not yet ready for production use. All Background Jobs, such as sending emails, are not yet implemented.**

This folder provides a production-like, fully dockerized deployment for Servobill, including:
- **Postgres** (database)
- **MinIO** (S3-compatible object storage)
- **Queue Workers** (background processing)
- **Next.js Application** (the main app)

## Prerequisites
- [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/) installed

## Usage

1. **Build and start all services:**

   ```sh
   docker-compose up --build
   ```

   This will start all containers in the background. The app will be available at [http://localhost:3000](http://localhost:3000).

2. **Stop all services:**

   ```sh
   docker-compose down
   ```

3. **Data Persistence:**
   - Postgres and MinIO data are persisted in Docker volumes (`postgres-data`, `minio-data`).

## Service Overview

- **Postgres**: Accessible at `localhost:5432` (user/pass: `servobill`/`servobill`)
- **MinIO**: S3 API at `localhost:9000`, web console at `localhost:9320` (access/secret: `servobill`/`servobillsecret`)
- **App**: Next.js app at [http://localhost:3000](http://localhost:3000)
- **Queue Workers**: Background processing, auto-started

## Customization
- You can adjust environment variables in `docker-compose.yml` as needed for your environment.
- For development, you may mount your local source code into the containers for hot-reloading.

## Notes
This setup is intended for local development and testing. For production, you need to adjust the configuration to your needs:

- we suggest to use a reverse proxy like nginx to handle the SSL termination and the routing to the servobill app, eg. caddy or traefik
- you need to set the secrets to actually secret values, not just the placeholder values
- you need to set the ALLOWED_EMAILS to your own email address
- you need to set the OAUTH_CLIENT_ID to your own google oauth client id
- you need to set the JWT_SECRET to a random string
- you need to set the S3_ENDPOINT to your own s3 endpoint (e.g. minio)
- you need to set the S3_ACCESS_KEY to your own s3 access key
- you need to set the S3_SECRET_KEY to your own s3 secret key
- you need to set the S3_BUCKET to your own s3 bucket
- email sending will be handled by a regular SMTP server, you need to set the SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, SMTP_FROM_NAME