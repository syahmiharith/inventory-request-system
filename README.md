# Inventory Request System

Request supplies, review them and issue stock. Approval accepts the request; stock changes only when the supplies are issued.

[Try demo](https://inventory-request-system-syahmiharith.vercel.app/) · [Case study](https://zsyahmi.dev/work/inventory-request-system) · [System design](docs/system-design.md)

## Try the shortage workflow

Each visitor receives a separate workspace with employee and administrator demo identities. Sessions expire after 24 hours; **Reset my demo** starts fresh data.

1. Choose **Request supplies** and request three reams of paper and three boxes of pens.
2. Add a purpose, then choose **Review this request as demo admin**.
3. Approve it. Stock stays unchanged; the pens are short by two boxes.
4. Record two boxes received with a delivery reference, then issue the request.
5. Inspect the timeline and stock movements: pens finish at zero and paper at nine.

## Decisions in the implementation

**Approval and issuance are separate events.** Approval does not reserve inventory. Issuance rechecks every line against current stock, so a previously approved request can still encounter a shortage.

**Stock and history change together.** Issuance updates inventory, request status and audit history in one database transaction. A shortage rolls the operation back. Idempotency keys protect creation, receipts and issuance against repeated submissions.

**Demo access is isolated.** Server-validated sessions scope roles and records to a visitor workspace. Switching roles demonstrates the workflow; it does not represent an organizational identity system.

The UI calls Next.js Server Actions and Route Handlers. Domain services use Drizzle ORM with Supabase PostgreSQL; database credentials remain server-side. The API stores the UI's **Issued** state as `fulfilled` for compatibility.

## Maintenance evidence

[Fulfillment tests](tests/integration/fulfill-request.test.ts) cover stock shortages, rollback and repeated issuance. [Workspace isolation tests](tests/integration/workspace-isolation.test.ts) exercise the visitor boundary.

A [CI runner compatibility fix](https://github.com/syahmiharith/inventory-request-system/commit/11393eb06f1d42dbf8dc650864543423233cbd78) keeps browser checks reproducible. The [demo operations guide](docs/demo-operations.md) documents cleanup monitoring, failure alerts, encrypted backups and restoration.

## Run locally

Requires Node.js, npm and PostgreSQL. Docker is optional for a local database.

```bash
npm install
cp .env.example .env.local
```

Set `DATABASE_URL` or `POSTGRES_URL` in `.env.local`. Keep connection strings server-side. If using the included local database, start it with `docker compose up -d`.

Run against an intended local or disposable demo database:

```bash
npm run db:migrate
npm run db:seed
npm run db:verify
npm run dev
```

Open http://localhost:3000. Migrations and seeding are manual steps; they do not run during Vercel builds. See [deployment configuration](docs/operations-and-deployment.md) and [demo release boundaries](docs/demo-release.md) before using a hosted database.

## Check a change

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

Integration tests need a test database. Browser tests mutate demo data: use a disposable environment, with `PLAYWRIGHT_BASE_URL` when targeting an existing app. The [testing strategy](docs/testing-strategy.md) describes coverage and setup.

## Further reading

- [Reviewer guide](docs/reviewer-guide.md): code entry points and workflow checks.
- [Business rules](docs/business-rules.md): request transitions and stock invariants.
- [Engineering decisions](docs/engineering-decisions.md): architecture tradeoffs.
- [Operations and deployment](docs/operations-and-deployment.md): connections, migrations and smoke checks.
- [Demo operations](docs/demo-operations.md): cleanup, monitoring, recovery and scheduling limits.

## Scope and origin

Originally a technical exercise, this is a portfolio demo. The [development history](docs/history/development-log.md) preserves its origins and former branding. It does not claim company production use.

Organizational deployment still needs real identity, employee-bound authorization, audit retention and release controls. Procurement, supplier workflows, customer request emails and load testing remain outside the demo. Operational failure alerts are separate from customer notifications.

ChatGPT and Codex assisted development; business rules, implementation, tests and documentation were reviewed and adjusted manually.
