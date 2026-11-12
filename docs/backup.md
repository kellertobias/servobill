# Backups (self-hosted)

Self-hosted installs back up with the `backup` image
(`ghcr.io/kellertobias/servobill/backup`, `Dockerfile` target `backup`). It
replaces DynamoDB point-in-time recovery and S3 versioning of the serverless
deployment.

Every backup is a folder `servobill-YYYYMMDD-HHMMSS` containing:

| File | Content |
|---|---|
| `database.dump` | Postgres dump (`pg_dump` custom format) |
| `database.sqlite` | consistent copy of the database, when `SQLITE_PATH` is used |
| `files.tar.gz` | the data directory: uploads, PDFs and the workers' event queue |
| `bucket/` | a copy of the S3 / MinIO bucket, when files are stored there |
| `manifest.txt` | when and what was backed up |

Old backups are deleted after `BACKUP_RETENTION_DAYS`. Backups are only
written completely: a failed run leaves no partial folder behind.

The in-app **email backup** (Settings → Backups) is independent of this: it
mails a JSON export of invoices, customers and settings, but no files and
nothing that could be restored automatically. Use both if you like.

## Docker Compose

The `backup` service in both compose files runs a backup every day at
`BACKUP_TIME` and keeps the backups in the `servobill-backups` volume.
Settings in `.env`:

```bash
BACKUP_TIME=02:30            # time of day (TZ applies)
TZ=Europe/Berlin
BACKUP_RETENTION_DAYS=14     # 0 keeps everything
BACKUP_VOLUME=./backups      # optional: host folder instead of a volume
```

A host folder must be writable by uid 1000: `mkdir backups && sudo chown 1000:1000 backups`.

Useful commands:

```bash
docker compose exec backup servobill-backup run      # back up now
docker compose exec backup servobill-backup list     # list backups
docker compose logs backup                           # last runs
```

The container is marked unhealthy when the last successful backup is older
than 26 hours, so it shows up in `docker compose ps` and in monitoring.

### Restore

```bash
docker compose stop app workers
docker compose run --rm backup restore latest          # shows what will be restored
docker compose run --rm backup restore latest --yes    # or a name from `list`
docker compose start workers app
```

The restore replaces the database tables and extracts the files over the data
directory (or copies them back into the bucket). Files that were added after
the backup are not deleted.

## Kubernetes

The `components/backup` component adds a nightly CronJob (02:30) that writes
to the `servobill-backups` PersistentVolumeClaim. It reads `POSTGRES_URL`,
the bucket settings and the `BACKUP_*` variables from the same ConfigMap and
Secret as the app. The example overlay includes it.

```bash
kubectl -n servobill create job --from=cronjob/servobill-backup backup-now
```

To restore, scale the app and workers to zero, then run a one-off pod with
the backup volume and the restore command:

```bash
kubectl -n servobill scale deploy/servobill-app deploy/servobill-workers --replicas=0
kubectl -n servobill create job --from=cronjob/servobill-backup restore-now --dry-run=client -o json \
  | jq '.spec.template.spec.containers[0].args = ["restore", "latest", "--yes"]' \
  | kubectl apply -f -
kubectl -n servobill logs -f job/restore-now
kubectl -n servobill scale deploy/servobill-workers deploy/servobill-app --replicas=1
```

When you use a managed database or an operator such as CloudNativePG, its own
backups are usually the better choice for the database; this job then still
covers the files.

## Offsite copies

A backup on the same machine does not help when the machine is lost. Set
`BACKUP_REMOTE` to copy every backup to any [rclone](https://rclone.org)
target (S3, Backblaze B2, SFTP, WebDAV, Google Drive, …). The remote is
configured with `RCLONE_CONFIG_<NAME>_*` variables, for example an S3 bucket:

```bash
BACKUP_REMOTE=offsite:my-backup-bucket/servobill
RCLONE_CONFIG_OFFSITE_TYPE=s3
RCLONE_CONFIG_OFFSITE_PROVIDER=AWS
RCLONE_CONFIG_OFFSITE_ACCESS_KEY_ID=...
RCLONE_CONFIG_OFFSITE_SECRET_ACCESS_KEY=...
RCLONE_CONFIG_OFFSITE_REGION=eu-central-1
```

Copies older than `BACKUP_REMOTE_RETENTION_DAYS` (default: the local
retention) are deleted there as well. Backups are not encrypted by this tool;
use an encrypted rclone remote (`type=crypt`) or a bucket with server-side
encryption if the target is not trusted.

## Notes

- The Postgres major version of the backup image must match the server
  (the compose files use 15). For another version build the image with
  `--build-arg POSTGRES_VERSION=16`.
- DynamoDB is not supported by this tool; the serverless deployment uses
  DynamoDB point-in-time recovery instead.
