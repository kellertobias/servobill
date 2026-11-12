#!/bin/sh
# Servobill backup and restore for self-hosted installs (Docker / Kubernetes).
#
#   servobill-backup run                 create one backup now
#   servobill-backup schedule            run daily at BACKUP_TIME (container mode)
#   servobill-backup list                list local backups
#   servobill-backup restore NAME|latest restore a backup (stop app + workers first)
#   servobill-backup health              exit 1 if the last backup is too old
#
# A backup is a folder BACKUP_DIR/servobill-YYYYMMDD-HHMMSS containing
#   database.dump   Postgres custom format dump (pg_restore)  - or -
#   database.sqlite consistent copy of the SQLite database
#   files.tar.gz    the data directory (uploads, PDFs, event queue)  - or -
#   bucket/         a copy of the S3 / MinIO bucket
#   manifest.txt    what was backed up and when
#
# Configuration (environment):
#   POSTGRES_URL           database to back up (same as the app)
#   SQLITE_PATH            SQLite database file instead of Postgres
#   DATA_DIR               data directory to archive (default /data, if present)
#   BUCKET_FILES           S3 bucket with the files (when no DATA_DIR files)
#   ENDPOINT_S3, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
#   BACKUP_DIR             where backups are written (default /backups)
#   BACKUP_TIME            time of day for `schedule`, HH:MM (default 02:30, TZ applies)
#   BACKUP_RETENTION_DAYS  delete local backups older than this (default 14, 0 = keep)
#   BACKUP_ON_START        also back up right after `schedule` starts (default false)
#   BACKUP_REMOTE          optional rclone target for an offsite copy, e.g.
#                          "offsite:my-bucket/servobill". Configure the remote
#                          with RCLONE_CONFIG_OFFSITE_* variables, see rclone docs.
#   BACKUP_REMOTE_RETENTION_DAYS  delete offsite copies older than this (default: same)

set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
DATA_DIR="${DATA_DIR:-/data}"
BACKUP_TIME="${BACKUP_TIME:-02:30}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
BACKUP_REMOTE_RETENTION_DAYS="${BACKUP_REMOTE_RETENTION_DAYS:-$BACKUP_RETENTION_DAYS}"
STATUS_FILE="$BACKUP_DIR/.last-success"

# rclone only reads its remotes from environment variables here; an empty
# config file avoids a "config file not found" notice on every call.
if [ -n "${RCLONE_CONFIG:-}" ] && [ ! -e "$RCLONE_CONFIG" ]; then
	: >"$RCLONE_CONFIG" 2>/dev/null || true
fi

log() {
	echo "$(date '+%Y-%m-%d %H:%M:%S') [backup] $*"
}

fail() {
	log "ERROR: $*" >&2
	exit 1
}

# Source bucket for files stored in S3 / MinIO, configured from the app's
# own variables so no extra rclone setup is needed.
use_bucket() {
	[ -n "${BUCKET_FILES:-}" ] && [ -z "${UPLOAD_DIRECTORY:-}" ]
}

setup_bucket_remote() {
	export RCLONE_CONFIG_SERVOBILLFILES_TYPE=s3
	export RCLONE_CONFIG_SERVOBILLFILES_PROVIDER="${S3_PROVIDER:-Other}"
	export RCLONE_CONFIG_SERVOBILLFILES_ENV_AUTH=true
	export RCLONE_CONFIG_SERVOBILLFILES_REGION="${AWS_REGION:-us-east-1}"
	if [ -n "${ENDPOINT_S3:-}" ]; then
		export RCLONE_CONFIG_SERVOBILLFILES_ENDPOINT="$ENDPOINT_S3"
		export RCLONE_CONFIG_SERVOBILLFILES_FORCE_PATH_STYLE=true
	fi
}

has_data_files() {
	[ -d "$DATA_DIR" ] && [ -n "$(ls -A "$DATA_DIR" 2>/dev/null)" ]
}

backup_database() {
	target="$1"
	if [ -n "${SQLITE_PATH:-}" ]; then
		log "Backing up SQLite database $SQLITE_PATH"
		sqlite3 "$SQLITE_PATH" ".backup '$target/database.sqlite'"
		echo "database: sqlite" >>"$target/manifest.txt"
	elif [ -n "${POSTGRES_URL:-}" ]; then
		log "Backing up Postgres database"
		pg_dump --format=custom --no-owner --no-acl \
			--dbname="$POSTGRES_URL" --file="$target/database.dump"
		echo "database: postgres ($(pg_dump --version))" >>"$target/manifest.txt"
	else
		fail "Neither POSTGRES_URL nor SQLITE_PATH is set"
	fi
}

backup_files() {
	target="$1"
	if use_bucket; then
		log "Copying bucket $BUCKET_FILES"
		setup_bucket_remote
		rclone copy --quiet "servobillfiles:$BUCKET_FILES" "$target/bucket"
		echo "files: bucket $BUCKET_FILES" >>"$target/manifest.txt"
	elif has_data_files; then
		log "Archiving $DATA_DIR"
		# The SQLite database is backed up consistently above, skip the live file
		exclude=""
		if [ -n "${SQLITE_PATH:-}" ]; then
			case "$SQLITE_PATH" in
			"$DATA_DIR"/*) exclude="--exclude=./${SQLITE_PATH#"$DATA_DIR"/}" ;;
			esac
		fi
		# shellcheck disable=SC2086
		tar -czf "$target/files.tar.gz" -C "$DATA_DIR" $exclude .
		echo "files: $DATA_DIR" >>"$target/manifest.txt"
	else
		log "No data directory or bucket configured, skipping files"
		echo "files: none" >>"$target/manifest.txt"
	fi
}

prune_local() {
	[ "$BACKUP_RETENTION_DAYS" -gt 0 ] 2>/dev/null || return 0
	find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name 'servobill-*' \
		-mtime "+$BACKUP_RETENTION_DAYS" | while read -r old; do
		log "Removing old backup $(basename "$old")"
		rm -rf "$old"
	done
}

copy_offsite() {
	name="$1"
	[ -n "${BACKUP_REMOTE:-}" ] || return 0
	log "Copying $name to $BACKUP_REMOTE"
	rclone copy --quiet "$BACKUP_DIR/$name" "$BACKUP_REMOTE/$name"
	if [ "$BACKUP_REMOTE_RETENTION_DAYS" -gt 0 ] 2>/dev/null; then
		rclone delete --quiet --min-age "${BACKUP_REMOTE_RETENTION_DAYS}d" "$BACKUP_REMOTE"
		rclone rmdirs --quiet --leave-root "$BACKUP_REMOTE"
	fi
}

run_backup() {
	mkdir -p "$BACKUP_DIR"
	name="servobill-$(date '+%Y%m%d-%H%M%S')"
	tmp="$BACKUP_DIR/.tmp-$name"
	rm -rf "$tmp"
	mkdir -p "$tmp"
	trap 'rm -rf "$tmp"' EXIT

	{
		echo "created: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
		echo "host: $(hostname)"
	} >"$tmp/manifest.txt"
	backup_database "$tmp"
	backup_files "$tmp"

	mv "$tmp" "$BACKUP_DIR/$name"
	trap - EXIT
	log "Backup written to $BACKUP_DIR/$name ($(du -sh "$BACKUP_DIR/$name" | cut -f1))"

	copy_offsite "$name"
	prune_local
	date '+%s' >"$STATUS_FILE"
}

seconds_until() {
	hour="${1%%:*}"
	minute="${1##*:}"
	now=$(date '+%s')
	today=$(date '+%Y-%m-%d')
	next=$(date -d "$today $hour:$minute:00" '+%s' 2>/dev/null) ||
		fail "BACKUP_TIME must be HH:MM, got '$1'"
	if [ "$next" -le "$now" ]; then
		next=$((next + 86400))
	fi
	echo $((next - now))
}

schedule() {
	log "Daily backups at $BACKUP_TIME, keeping $BACKUP_RETENTION_DAYS days in $BACKUP_DIR"
	if [ "${BACKUP_ON_START:-false}" = "true" ]; then
		run_backup || log "Backup failed, retrying at the next scheduled time"
	fi
	while true; do
		wait_s=$(seconds_until "$BACKUP_TIME")
		log "Next backup in $((wait_s / 60)) minutes"
		sleep "$wait_s"
		# Run in a subshell so a failure does not stop the schedule
		(run_backup) || log "Backup failed, retrying at the next scheduled time"
	done
}

list_backups() {
	find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name 'servobill-*' |
		sort | while read -r dir; do
		echo "$(basename "$dir")  $(du -sh "$dir" | cut -f1)"
	done
}

resolve_backup() {
	if [ "$1" = "latest" ]; then
		latest=$(find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name 'servobill-*' | sort | tail -n 1)
		[ -n "$latest" ] || fail "No backups found in $BACKUP_DIR"
		echo "$latest"
	elif [ -d "$BACKUP_DIR/$1" ]; then
		echo "$BACKUP_DIR/$1"
	elif [ -d "$1" ]; then
		echo "$1"
	else
		fail "Backup $1 not found (see: servobill-backup list)"
	fi
}

restore() {
	[ $# -ge 1 ] || fail "Usage: servobill-backup restore NAME|latest [--yes]"
	source_dir=$(resolve_backup "$1")
	confirmed="${2:-}"
	log "Restoring $(basename "$source_dir"):"
	sed 's/^/    /' "$source_dir/manifest.txt"
	if [ "$confirmed" != "--yes" ]; then
		echo
		echo "This REPLACES the current database and files. Stop the app and workers"
		echo "first (docker compose stop app workers). Run again with --yes to restore."
		exit 2
	fi

	if [ -f "$source_dir/database.dump" ]; then
		[ -n "${POSTGRES_URL:-}" ] || fail "POSTGRES_URL is not set"
		log "Restoring Postgres database"
		pg_restore --clean --if-exists --no-owner --no-acl --single-transaction \
			--dbname="$POSTGRES_URL" "$source_dir/database.dump"
	elif [ -f "$source_dir/database.sqlite" ]; then
		[ -n "${SQLITE_PATH:-}" ] || fail "SQLITE_PATH is not set"
		log "Restoring SQLite database to $SQLITE_PATH"
		rm -f "$SQLITE_PATH-wal" "$SQLITE_PATH-shm"
		cp "$source_dir/database.sqlite" "$SQLITE_PATH"
	fi

	if [ -f "$source_dir/files.tar.gz" ]; then
		log "Restoring files to $DATA_DIR"
		mkdir -p "$DATA_DIR"
		tar -xzf "$source_dir/files.tar.gz" -C "$DATA_DIR"
	elif [ -d "$source_dir/bucket" ]; then
		use_bucket || fail "BUCKET_FILES is not set, cannot restore the bucket"
		log "Restoring bucket $BUCKET_FILES"
		setup_bucket_remote
		rclone copy --quiet "$source_dir/bucket" "servobillfiles:$BUCKET_FILES"
	fi
	log "Restore finished. Start the app and workers again."
}

health() {
	# Healthy until the first backup is due, then the last one must be recent.
	max_age=$((26 * 3600))
	if [ ! -f "$STATUS_FILE" ]; then
		started=$(stat -c '%Y' /proc/1 2>/dev/null || date '+%s')
		[ $(($(date '+%s') - started)) -lt "$max_age" ]
		return
	fi
	[ $(($(date '+%s') - $(cat "$STATUS_FILE"))) -lt "$max_age" ]
}

command="${1:-schedule}"
[ $# -gt 0 ] && shift
case "$command" in
run) run_backup ;;
schedule) schedule ;;
list) list_backups ;;
restore) restore "$@" ;;
health) health ;;
*) fail "Unknown command '$command' (run, schedule, list, restore, health)" ;;
esac
