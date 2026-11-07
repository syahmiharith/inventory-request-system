# Free-tier demo operations

Production runs on Vercel Hobby and the existing Supabase Free project. No paid database, backup add-on, log drain, or monitoring subscription is required. The repository is public and the workflows use standard GitHub-hosted Linux runners. Encrypted backup artifacts expire after seven days.

## Access boundaries

`inventory_demo_runtime` remains the server-side app login. It owns only the private demo schema and cannot access the legacy public tables. Workspace authorization is enforced in the application.

`inventory_demo_backup` has SELECT access to the eleven private tables through explicit backup-only SELECT policies. It cannot write, create objects, bypass RLS, or read legacy public tables. Only this read-only connection is stored as the GitHub `DEMO_DATABASE_URL` secret. Future private tables require an explicit review of backup grants and policies.

The hosted migrations under `supabase/migrations` are separate from the standalone Drizzle migration chain. They were applied manually to the shared Supabase project. Nine legacy public tables now have RLS enabled and no browser-role grants. The public trigger function is no longer executable by `anon`, `authenticated`, or PUBLIC. Existing record counts were verified unchanged. These tables intentionally have no browser-access policies; the remaining RLS-without-policy information notices describe that default-deny boundary.

## Health and cleanup

GitHub Actions invokes `/api/demo/cleanup` hourly at minute 17 UTC using the encrypted `DEMO_CLEANUP_SECRET` repository secret. The application still validates this value against its server-side Vercel `CRON_SECRET`. The repository owner explicitly approved transferring that cleanup-only credential to GitHub's encrypted secret store. The database write credential is not shared with this workflow. The former Vercel cron definition is removed so there is one scheduler.

Each run uses the existing transactional cleanup endpoint, which deletes up to 200 expired workspaces. Access expires after 24 hours even before physical cleanup. At most three safe attempts handle a lost response; the receipt's deletion count describes the successful attempt, rather than an inferred total across lost responses. Only a completion timestamp, count, attempt count, GitHub event type, and run ID are retained in a seven-day receipt artifact. No visitor identifiers or credentials are included.

The **Demo health and cleanup monitor** runs hourly at minute 37 UTC. It checks HTTP/database health, rejects expired data overdue by more than two hours, and checks GitHub's cleanup workflow history for a successful main-branch run within two hours. The short-lived GitHub token has Actions read permission, and the database login remains read-only. Missing cleanup invocations are detected even when the database has no expired rows. GitHub schedules can be delayed or disabled after prolonged repository inactivity; inspect the Actions page when resuming an inactive portfolio.

Both workflows have a manual `simulate_failure` option. The health test uses an unreachable local URL; the cleanup test sends a deliberately invalid credential without changing the production secret. These controls exercise failed-check notification without disrupting the app or deleting active data. Run normally afterward to verify recovery. Delivery to the connected Gmail inbox was verified by matching the email's workflow-run link to the controlled monitor failure. The scheduled backup failure notification was also received. Keep GitHub Actions email notifications enabled in the repository owner's account.

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
