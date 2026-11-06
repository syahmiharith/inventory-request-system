# Free-tier demo operations

Production runs on Vercel Hobby and the existing Supabase Free project. No paid database, backup add-on, log drain, or monitoring subscription is required. The repository is public and the workflows use standard GitHub-hosted Linux runners. Encrypted backup artifacts expire after seven days.

## Access boundaries

`inventory_demo_runtime` remains the server-side app login. It owns only the private demo schema and cannot access the legacy public tables. Workspace authorization is enforced in the application.

`inventory_demo_backup` has SELECT access to the eleven private tables through explicit backup-only SELECT policies. It cannot write, create objects, bypass RLS, or read legacy public tables. Only this read-only connection is stored as the GitHub `DEMO_DATABASE_URL` secret. Future private tables require an explicit review of backup grants and policies.

The hosted migrations under `supabase/migrations` are separate from the standalone Drizzle migration chain. They were applied manually to the shared Supabase project. Nine legacy public tables now have RLS enabled and no browser-role grants. The public trigger function is no longer executable by `anon`, `authenticated`, or PUBLIC. Existing record counts were verified unchanged. These tables intentionally have no browser-access policies; the remaining RLS-without-policy information notices describe that default-deny boundary.

## Health and cleanup

Vercel invokes `/api/demo/cleanup` daily on `0 3 * * *` with `CRON_SECRET`. Hobby scheduling is within the hour, noon to 12:59 Asia/Seoul. Access expires after 24 hours even before physical cleanup.

The **Demo health and cleanup monitor** workflow runs every six hours and can also be run manually. It checks the public health endpoint with three bounded attempts, then queries the read-only connection for expired workspaces overdue by more than 26 hours. A failed HTTP check, database connection, or overdue cleanup fails the workflow. This detects a missed cleanup without depending on short-lived Vercel logs. GitHub schedules can be delayed and public-repository schedules can be disabled after prolonged inactivity; check the Actions page when resuming an inactive portfolio.

Use the manual `simulate_failure` input to exercise a failed check without disrupting the app. Rerun normally to prove recovery. GitHub Actions records failures; email/push delivery depends on the account's Actions notification settings. An inbox-delivery test has not been performed. No external message is sent by the scripts.

## Encrypted backups and restoration

The **Encrypted demo backup and restore** workflow runs daily at 04:35 UTC, or manually. It uses a consistent exported PostgreSQL snapshot to dump only `inventory_demo`. It restores the dump into a fresh local PostgreSQL 17 container and compares every table's row count and content digest, RLS flags, all constraints, indexes, and policies. A failed comparison prevents artifact upload. The target container is removed after verification.

The verified dump and manifest are encrypted with AES-256-GCM before upload. No plaintext database file is uploaded or retained by the scripts. `DEMO_BACKUP_KEY` is a separate 32-byte hexadecimal GitHub secret. Keep an offline copy of this recovery key; GitHub does not let you retrieve secret values later. The initial key is stored outside the repository in the local work directory with owner-only file permissions. Key rotation requires retaining the previous key until its backups expire.

To create a backup locally with Docker available:

```sh
DEMO_DATABASE_URL_FILE=/secure/path/backup-reader.url \
DEMO_BACKUP_KEY_FILE=/secure/path/backup.key \
DEMO_BACKUP_DIR=/secure/path/encrypted-backups \
node scripts/demo-backup.mjs
```

Download an encrypted artifact from the backup workflow and test recovery using only the artifact and offline key:

```sh
DEMO_BACKUP_KEY_FILE=/secure/path/backup.key \
node scripts/demo-backup.mjs verify /secure/path/inventory-backup.enc
```

This command decrypts in memory, restores into a new disposable PostgreSQL 17 container, and checks the embedded manifest. It does not replace production data. For disaster recovery into a replacement hosted project, provision the app and backup roles separately, restore the verified schema, reapply reviewed role grants and search paths, and stage a production build with the replacement connection. Do not expose this schema in the Data API. The backup does not include legacy public data, Supabase Auth, or Storage; the visitor demo does not use those services.

## Release and rollback

Keep the current production deployment ID and the last verified workspace-aware deployment ID in the release PR. Check the immutable candidate with production credentials before promotion. After promotion, check health and the public workflow. A rollback must target a workspace-aware build against the same private schema. Never roll back to the shared legacy application.

The initial isolated release is commit `83917b500eb50a24d53a32fef11d0ae0ee7a7dc9`, Vercel deployment `dpl_8y1SsE5kYe2AGGGvwfVhA5RddsZA`. It is a compatible fallback for the operations update. The hosted RLS changes and backup-reader addition are additive and compatible with that release.
