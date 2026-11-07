import { randomUUID } from "node:crypto";
import { it, expect } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { demoWorkspaces, inventoryItems } from "@/db/schema";
import {
  createWorkspace,
  deleteWorkspace,
  cleanupExpiredWorkspaces,
} from "@/lib/demo-session";
import { GET } from "@/app/api/demo/cleanup/route";

it("authorizes cleanup, bounds each batch, removes children and preserves live sessions on replay", async () => {
  // A reused disposable test database can retain expired browser fixtures.
  // Drain those before asserting this test's exact batch sizes.
  while ((await cleanupExpiredWorkspaces()) > 0) {
    /* bounded batches */
  }
  const active = await createWorkspace();
  const expired = await createWorkspace();
  const placeholders = Array.from({ length: 200 }, () => ({
    id: randomUUID(),
    tokenHash: randomUUID(),
    expiresAt: new Date(1000),
  }));
  const originalSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "cleanup-test-secret";
  try {
    await db.insert(demoWorkspaces).values(placeholders);
    await db
      .update(demoWorkspaces)
      .set({ expiresAt: new Date(0) })
      .where(eq(demoWorkspaces.id, expired.workspace.id));
    expect(
      (await GET(new Request("http://localhost/api/demo/cleanup"))).status,
    ).toBe(401);
    expect(
      await db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.workspaceId, expired.workspace.id)),
    ).toHaveLength(3);
    const invoke = () =>
      GET(
        new Request("http://localhost/api/demo/cleanup", {
          headers: { authorization: "Bearer cleanup-test-secret" },
        }),
      );
    expect(await (await invoke()).json()).toEqual({ deleted: 200 });
    expect(
      await db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.workspaceId, expired.workspace.id)),
    ).toHaveLength(0);
    expect(await (await invoke()).json()).toEqual({ deleted: 1 });
    expect(await (await invoke()).json()).toEqual({ deleted: 0 });
    expect(
      await db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.workspaceId, active.workspace.id)),
    ).toHaveLength(3);
  } finally {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
    await deleteWorkspace(active.workspace.id);
    await deleteWorkspace(expired.workspace.id);
    await db.delete(demoWorkspaces).where(
      inArray(
        demoWorkspaces.id,
        placeholders.map((row) => row.id),
      ),
    );
  }
});
