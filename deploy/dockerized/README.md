# Dockerized Deployment for Servobill

This folder provides a production-like, fully dockerized deployment for Servobill, including:

- **Postgres** (database)
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
   - Postgres data is persisted in Docker volumes (`postgres-data`).
   - Local file storage is persisted in the `./data` folder.

## Service Overview

- **Postgres**: Not exposed to the host, only accessible from the servobill app
- **Queue Workers**: Background processing, auto-started, not exposed to the host
- **App**: Next.js app at [http://localhost:3000](http://localhost:3000)

## Customization
- You can adjust environment variables in `docker-compose.yml` as needed for your environment.
- For development, you may mount your local source code into the containers for hot-reloading.

## Notes
This setup is intended for local development and testing. For production, you need to adjust the configuration to your needs:

- we suggest to use a reverse proxy like traefik to handle the SSL termination and the routing to the servobill app
- you need to set the secrets to actually secret values, not just the placeholder values
- you need to set the ALLOWED_EMAILS to your own email address
- you need to set the OAUTH_CLIENT_ID to your own google oauth client id
- you need to set the JWT_SECRET to a random string
- email sending will be handled by a regular SMTP server, you need to set the SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, SMTP_FROM_NAME