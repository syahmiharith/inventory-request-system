import { connect, secret } from "./demo-operations.mjs";
import { verifyCleanupHistory } from "./demo-cleanup.mjs";

const url =
  process.env.DEMO_HEALTH_URL ??
  "https://inventory-request-system-syahmiharith.vercel.app/api/health";
let healthy = false;
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    healthy =
      response.status === 200 && (await response.json()).status === "ok";
    if (healthy) break;
  } catch {
    /* Retry transient network errors without logging secrets or response data. */
  }
  if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 2000));
}
if (!healthy)
  throw new Error(
    "Production database health check failed after three attempts",
  );

const db = connect(secret("DEMO_DATABASE_URL"));
try {
  const [result] = await db`select current_schema() as schema,
    count(*) filter (where expires_at < now() - interval '2 hours')::int as overdue,
    count(*) filter (where expires_at < now())::int as expired
    from inventory_demo.demo_workspaces`;
  if (result.schema !== "inventory_demo" || result.overdue > 0)
    throw new Error("Demo cleanup overdue or database schema incorrect");
  const cleanup =
    process.env.GITHUB_ACTIONS === "true"
      ? await verifyCleanupHistory({
          repository: process.env.GITHUB_REPOSITORY,
          token: process.env.GH_MONITOR_TOKEN,
        })
      : null;
  console.log(
    JSON.stringify({
      health: "ok",
      cleanup: "within hourly window",
      lastCleanup: cleanup,
      expired: result.expired,
    }),
  );
} finally {
  await db.end();
}
