# Free-tier preview isolation

Production uses `inventory_demo` / `inventory_demo_runtime`. All new previews use `inventory_preview` / `inventory_preview_runtime` on the existing free Supabase project. These are separate data and permission boundaries, not separate compute instances: storage, availability and quotas remain shared. No production data is copied; each preview visitor receives fresh synthetic seed data.

The preview login owns only its private schema, has no production or legacy table access, no role-creation or database-creation privileges, and an eight-connection limit. Neither private schema is exposed through the Data API. Tables have RLS enabled; the owning server login is trusted, with visitor authorization enforced by the application. Direct browser roles have no schema access.

`DATABASE_URL` is a sensitive Preview-only Vercel variable. Old branch overrides must point to the same preview login. Production secrets are never copied into Preview. `db/deployment-boundary.ts` rejects mismatched database logins before a hosted build can succeed. Each login has its own schema-only search path. Passwords are provisioned separately and never committed.

Hosted migration `20261108104648_isolate_inventory_previews.sql` creates the preview schema from the standalone migration chain, without copying records. Apply it manually once, in a transaction; the login starts disabled until securely provisioned. Future database changes require a reviewed schema-qualified preview migration, verification, then a separate production migration. Builds never run migrations. All preview branches share this preview schema; visitor workspaces remain isolated from each other.

Preview sessions expire after 24 hours. Starting a new preview workspace runs bounded cleanup of expired preview workspaces and rate-limit records. Idle expired rows remain until the next preview entry. Production retains its existing hourly cleanup. Preview cleanup needs no production credential, GitHub secret or paid scheduler.

Changing Vercel environment variables affects future builds only. Retire old preview deployments retaining production credentials after verifying the replacement. Keep production deployment and rollback history.

Verification: connect with the actual preview login, check `current_schema()`, verify production and legacy table reads fail with SQLSTATE 42501, then exercise the preview UI. Check that a preview workspace token hash has no matching production workspace and that browser requests to production records fail in the preview session. Record deployment checks in the release PR.
