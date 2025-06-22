# Dockerized Deployment for Servobill

This folder provides a production-like, fully dockerized deployment for Servobill, including:

- **Postgres** (database)
- **Queue Workers** (background processing)
- **Next.js Application** (the main app)

## Prerequisites
- [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/) installed

## Deployment Options

### Option 1: Development/Testing (Local Build)

Use `docker-compose.yml` for local development and testing:

```sh
# Build and start all services
docker-compose up --build

# Stop all services
docker-compose down
```

### Option 2: Production (Pre-built Images)

Use `docker-compose.prod.yml` with pre-built images from GitHub Container Registry:

```sh
# Deploy latest version
./deploy.sh

# Deploy specific version
VERSION=1.0.0 ./deploy.sh

# Deploy on custom port
PORT=8080 ./deploy.sh
```

## Quick Deployment Script

The `deploy.sh` script provides an easy way to deploy Servobill using pre-built Docker images:

### Usage

```bash
# Deploy latest version
./deploy.sh

# Deploy specific version
./deploy.sh -v 1.0.0

# Deploy on custom port
./deploy.sh -p 8080

# Deploy from different repository
./deploy.sh -r your-username/servobill

# Show help
./deploy.sh -h
```

### Environment Variables

Set these environment variables before running the deployment script:

```bash
# Required for authentication
export ALLOWED_EMAILS="your-email@example.com"
export OAUTH_CLIENT_ID="your-google-oauth-client-id"
export OAUTH_CLIENT_SECRET="your-google-oauth-client-secret"
export JWT_SECRET="your-random-jwt-secret"

# Required for email sending
export SMTP_HOST="your-smtp-server.com"
export SMTP_PORT="587"
export SMTP_USER="your-smtp-username"
export SMTP_PASSWORD="your-smtp-password"
export SMTP_FROM="noreply@yourdomain.com"
export SMTP_FROM_NAME="Your Company Name"

# Optional configuration
export NEXT_PUBLIC_API_URL="https://yourdomain.com"
export INSECURE_COOKIES="false"  # Set to "true" for development
```

## Semantic Versioning

Servobill uses semantic versioning with automated releases. When you push to the main branch:

1. **Linting and Testing**: Code is linted and tested
2. **Version Analysis**: Commit messages are analyzed to determine version bump
3. **Docker Build**: Images are built and pushed to GitHub Container Registry
4. **Release Creation**: A GitHub release is created with the new version

### Commit Message Convention

Use conventional commit messages to trigger version bumps:

- `feat:` - New features (minor version bump)
- `fix:` - Bug fixes (patch version bump)
- `docs:` - Documentation changes (patch version bump)
- `style:` - Code style changes (patch version bump)
- `refactor:` - Code refactoring (patch version bump)
- `perf:` - Performance improvements (patch version bump)
- `test:` - Adding tests (patch version bump)
- `chore:` - Maintenance tasks (patch version bump)
- `BREAKING CHANGE:` - Breaking changes (major version bump)

### Examples

```bash
# Patch release (1.0.0 -> 1.0.1)
git commit -m "fix: resolve login issue"

# Minor release (1.0.0 -> 1.1.0)
git commit -m "feat: add invoice templates"

# Major release (1.0.0 -> 2.0.0)
git commit -m "feat: redesign user interface

BREAKING CHANGE: API endpoints have changed"
```

## Service Overview

- **Postgres**: Database server (not exposed to host)
- **Queue Workers**: Background processing for emails, PDF generation, etc.
- **App**: Next.js application (exposed on port 3000 by default)

## Data Persistence

- **Postgres data**: Persisted in Docker volumes (`postgres-data`)
- **File storage**: Persisted in the `./data` folder (attachments, generated PDFs)

## Production Considerations

For production deployment, consider:

1. **Reverse Proxy**: Use Traefik, Nginx, or similar for SSL termination and routing
2. **Secrets Management**: Store sensitive environment variables securely
3. **Backup Strategy**: Implement regular backups of Postgres data and file storage
4. **Monitoring**: Set up monitoring and logging for the containers
5. **Updates**: Use the deployment script to easily update to new versions

## Troubleshooting

### Check Service Status
```bash
docker-compose -f docker-compose.prod.yml ps
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f app
```

### Restart Services
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Clean Up
```bash
# Stop and remove containers
docker-compose -f docker-compose.prod.yml down

# Remove volumes (WARNING: This will delete all data)
docker-compose -f docker-compose.prod.yml down -v
```

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