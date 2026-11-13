# Moving from AWS (serverless) to a self-hosted install

The serverless deployment keeps its data in DynamoDB and S3. A self-hosted
install (Docker Compose or Kubernetes) uses Postgres (or SQLite) and either a
local data directory or S3-compatible storage. Moving over means copying both,
without changing anything on AWS. The AWS installation keeps running until you
switch the domain.

## 1. Set up the new installation

Set it up as described in [self-hosting.md](self-hosting.md), with two
differences while AWS is still live:

- **Do not configure email** (`SMTP_*`) yet. The copy contains scheduled
  sends and reminders, which would otherwise go out a second time.
- Use a different host name than the live installation, or only the local
  network.

Start the stack once so the database tables are created.

## 2. Copy the database

Run the migration from a machine with read access to the DynamoDB table:

```bash
AWS_PROFILE=<profile> AWS_REGION=eu-central-1 \
SOURCE_TABLE=<stage>-ServobillDataTableTable-xxxx \
TARGET_POSTGRES_URL=postgres://servobill:<password>@localhost:5432/servobill \
npm run migrate:dynamodb-to-relational -- --dry-run
```

Without `--dry-run` it writes the data. The output lists, per entity, how many
records were read and how many are in the target afterwards; it fails if the
target has fewer.

- The table name is in the AWS console or in `.sst/outputs.json`.
- If the database is only reachable on the server, tunnel the port, for
  example `ssh -L 5432:localhost:<port> server`.
- The table is only read (`Scan`). Saving does not publish any events, so no
  PDFs or emails are triggered.
- Running it again updates the copy. `--reset` empties the target first and
  gives an exact copy: use it for the final switch-over.
- Not copied: sessions (everyone signs in again) and the audit log.
- Users: the serverless installation signed in with Google only. Configure
  sign in for the new installation (local users, Google or OIDC, see
  [authentication.md](authentication.md)); `INITIAL_ADMIN_EMAIL` creates the
  first administrator.

## 3. Copy the files

Attachments and invoice PDFs reference their S3 bucket and key. Keep these
references valid by copying the bucket into the new storage **under the same
bucket name**:

- Local data directory (`UPLOAD_DIRECTORY=/data/files`): copy the bucket to
  `/data/files/<bucket name>/`, e.g.
  `aws s3 sync s3://<bucket> ./files/<bucket>` and then onto the server. Make
  the files readable for the container user (uid 1000).
- S3-compatible storage: create a bucket with the same name and copy the
  objects (`rclone sync` or `aws s3 sync`).

## 4. Check the copy

Sign in to the new installation and compare a few invoices, expenses with
receipts and the settings with the live installation. Open some attachments
and invoice PDFs.

## 5. Switch over

1. Stop using the AWS installation (no new invoices or expenses from now on).
2. Copy again: database with `--reset`, files with `sync` (only changes are
   transferred).
3. Configure email on the new installation.
4. Point the domain to the new installation (DNS) and update `PUBLIC_URL` and
   sign-in redirect URLs.
5. Keep the AWS stage for a while as a fallback; `sst remove` it later once
   everything works. DynamoDB point-in-time recovery and S3 versioning protect
   the old data until then.
