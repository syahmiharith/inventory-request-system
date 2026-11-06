# Visitor demo release

Visitors receive a private workspace with an opaque HttpOnly cookie. The server stores its token hash, current role, and 24-hour expiry. Every business query uses the scoped Drizzle client. RLS blocks direct public Data API access, with server-side Drizzle access using the database owner connection. Composite foreign keys reject relationships across workspaces. Persistent shared read caching is disabled. Historical records belong to the legacy workspace and have no visitor session.

The database API retains `fulfilled` as its terminal status. Screens call this Issued. Optional UUID `key` fields on request creation and issuance support safe retries. Reuse the key and identical payload after an uncertain response. Stock receipts always require a key. Mutations are bounded to 120 per minute per workspace. Creation is bounded to 30 per hour per source address and 300 globally.

## Shared-project preview

The free hosted preview uses the `inventory_demo` schema inside the existing `inventory-request-module` Supabase project. Its `inventory_demo_runtime` login owns the private demo objects, has `search_path=inventory_demo`, and cannot read the existing public request table. The connection is stored in the branch-specific Vercel Preview `DATABASE_URL` secret. The public application's connection remains a separate deployment setting.

Supabase migration `bootstrap_private_inventory_demo` created this schema by applying the repository migration chain with every explicit public-schema reference replaced by the private schema name. The original public tables were outside that migration boundary. Keep this schema outside the Data API's exposed schemas. For future hosted changes, review and apply private-schema-qualified migrations. The standard public migration chain is for standalone databases and must not be run against this shared-project deployment.

Supabase separately flags RLS disabled on the existing public tables. Their Data API access policies require a separate review before enabling RLS or changing existing client access.

## Before release

- Run `npm ci`, type checking, lint, unit/component tests, real PostgreSQL integration tests, browser tests, and the production build.
- For a standalone database, apply migrations 0005 and 0006 manually with a database backup available. For the shared-project preview, follow the private-schema migration procedure above. Inspect workspace counts and legacy record counts after migration. Build commands never apply migrations.
- Configure `CRON_SECRET` in Vercel. Vercel Cron runs on production deployments. Call the authenticated cleanup endpoint manually during preview testing. The scheduled production cleanup calls `/api/demo/cleanup` daily and deletes up to 100 expired workspaces per call. Expired sessions are rejected immediately, independently of cleanup timing. Retry cleanup if a batch fails and monitor backlog.
- Configure an uptime monitor against `/api/health`. A database outage returns 503. Inspect Vercel runtime errors for failed operations. Verify alerts by an intentional failure in a disposable deployment.
- Verify backup restoration into a separate database. Compare request, stock, movement, history, and workspace ownership records. Record the provider backup timestamp and restored counts. A local logical dump check alone does not verify hosted backups.
- Open two fresh browser contexts on the deployed URL. Complete the three scenarios, attempt cross-workspace IDs, reset one workspace, and verify the other remains usable. Verify keyboard focus and narrow layouts.

## Walkthrough

1. Choose Request supplies. Select paper and pens, request three of each, and submit a purpose.
2. Choose Review this request as demo admin. Approve it. Verify that approval leaves stock unchanged.
3. Inspect the pen shortage. Record two boxes received with a delivery reference.
4. Issue all items. Verify both stock movements and the request timeline. Reload and confirm the completed request has no issue action.
5. For competing demand, open the two seeded competing requests in separate tabs, approve both, and attempt issuance. Only one can consume the remaining box of pens.

## Rollback

Disable the public deployment or route traffic to a maintenance page before rollback. Older application versions lack workspace scoping and must not connect to the migrated public demo database. Keep the additive migration and visitor data intact. Deploy the last verified workspace-aware version, or restore a backup into a separate database and validate access boundaries before directing traffic to it. Never reconnect the shared demo code while visitor data is present.

## Visitor research

Recruit one person who requests or issues supplies and five unfamiliar visitors. Ask visitors to request supplies and get them issued without explaining the role switch. Record task completion, hesitation, and their explanation of when stock changed. Target four unaided ordinary completions and five correct explanations of approval versus issuance. Observe the operator's current process, ship one improvement based on an observed problem, and have the operator repeat the task. Publish only verified results and consented, redacted evidence. Deployed verification, alert delivery, hosted restore verification, and participant outcomes remain release evidence to collect.
