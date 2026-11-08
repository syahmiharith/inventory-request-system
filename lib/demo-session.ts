import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  demoWorkspaces,
  inventoryItems,
  inventoryRequests,
  inventoryRequestItems,
  requestHistory,
  users,
} from "@/db/schema";
import { DomainError } from "./errors";

export const workspaceCookie = "inventory-demo-session";
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const getWorkspace = cache(async () => {
  const token = (await cookies()).get(workspaceCookie)?.value;
  if (!token)
    throw new DomainError("Demo workspace expired. Start a new demo.", 410);
  const [workspace] = await db
    .select()
    .from(demoWorkspaces)
    .where(eq(demoWorkspaces.tokenHash, hashToken(token)));
  if (!workspace || workspace.expiresAt <= new Date())
    throw new DomainError("Demo workspace expired. Start a new demo.", 410);
  return workspace;
});

export async function rateLimit(key: string, limit: number, seconds: number) {
  const rows = await db.execute(sql`
    INSERT INTO demo_rate_limits(key, count, resets_at)
    VALUES (${key}, 1, now() + ${seconds} * interval '1 second')
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN demo_rate_limits.resets_at <= now() THEN 1 ELSE demo_rate_limits.count + 1 END,
      resets_at = CASE WHEN demo_rate_limits.resets_at <= now() THEN now() + ${seconds} * interval '1 second' ELSE demo_rate_limits.resets_at END
    RETURNING count
  `);
  if (Number(rows[0]?.count) > limit)
    throw new DomainError(
      "Demo activity limit reached. Please try again shortly.",
      429,
    );
}

export async function createWorkspace() {
  // Previews use their own database login. Reclaim expired test data on entry
  // without requiring a paid scheduler or exposing production cleanup secrets.
  if (process.env.VERCEL_ENV === "preview") await cleanupExpiredWorkspaces();
  const token = randomBytes(32).toString("hex");
  const workspace = await db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(demoWorkspaces)
      .values({
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 86_400_000),
      })
      .returning();
    const workspaceId = workspace.id;
    const [employee] = await tx
      .insert(users)
      .values([
        {
          workspaceId,
          name: "Evan Employee",
          email: "employee@inventory.local",
          role: "employee",
          department: "Marketing",
        },
        {
          workspaceId,
          name: "Aisha Admin",
          email: "admin@inventory.local",
          role: "admin",
          department: "Operations",
        },
      ])
      .returning();
    const items = await tx
      .insert(inventoryItems)
      .values([
        {
          workspaceId,
          name: "A4 Copy Paper",
          sku: "PAPER-001",
          category: "Stationery",
          unit: "Ream",
          quantityOnHand: 13,
        },
        {
          workspaceId,
          name: "Blue Ballpoint Pens",
          sku: "PEN-001",
          category: "Stationery",
          unit: "Box",
          quantityOnHand: 1,
        },
        {
          workspaceId,
          name: "Safety Gloves",
          sku: "GLOVE-001",
          category: "Safety",
          unit: "Box",
          quantityOnHand: 8,
          quantityReserved: 2,
        },
      ])
      .returning();
    for (const [index, scenario] of [
      "Ordinary fulfillment",
      "Shortage recovery",
      "Competing request A",
      "Competing request B",
    ].entries()) {
      const [request] = await tx
        .insert(inventoryRequests)
        .values({
          workspaceId,
          requestCode: `REQ-DEMO-${index + 1}`,
          requesterId: employee.id,
          department: employee.department,
          warehouse: "Main Warehouse",
          requiredBy: new Date(Date.now() + 7 * 86_400_000),
          reason: scenario,
        })
        .returning();
      await tx.insert(inventoryRequestItems).values(
        (index === 1 ? items.slice(0, 2) : [items[index >= 2 ? 1 : 0]]).map(
          (item) => ({
            workspaceId,
            requestId: request.id,
            itemId: item.id,
            unit: item.unit,
            quantityRequested: index === 1 ? 3 : 1,
          }),
        ),
      );
      await tx.insert(requestHistory).values({
        workspaceId,
        requestId: request.id,
        actorName: employee.name,
        actorRole: "Employee",
        action: "request_created",
        toStatus: "pending",
      });
    }
    for (const [index, status] of (
      ["approved", "fulfilled", "rejected"] as const
    ).entries()) {
      const createdAt = new Date(Date.now() - (3 - index) * 3_600_000);
      const [request] = await tx
        .insert(inventoryRequests)
        .values({
          workspaceId,
          requestCode: `REQ-HISTORY-${index + 1}`,
          requesterId: employee.id,
          department: employee.department,
          warehouse: "Main Warehouse",
          requiredBy: new Date(Date.now() + 86_400_000),
          reason: `Seeded ${status === "fulfilled" ? "issued" : status} example`,
          status,
          createdAt,
          adminComment:
            status === "rejected"
              ? "Duplicate of the team's existing supply request."
              : null,
          fulfilledAt:
            status === "fulfilled"
              ? new Date(createdAt.getTime() + 3000)
              : null,
        })
        .returning();
      await tx.insert(inventoryRequestItems).values({
        workspaceId,
        requestId: request.id,
        itemId: items[0].id,
        quantityRequested: 1,
        quantityApproved: status === "rejected" ? null : 1,
        unit: items[0].unit,
      });
      const events: Array<
        Pick<
          typeof requestHistory.$inferInsert,
          | "action"
          | "actorName"
          | "actorRole"
          | "fromStatus"
          | "toStatus"
          | "metadata"
          | "note"
        >
      > = [
        {
          action: "request_created",
          actorName: employee.name,
          actorRole: "Employee",
          toStatus: "pending",
          fromStatus: undefined,
          metadata: {},
          note: undefined,
        },
      ];
      if (status !== "rejected")
        events.push({
          action: "request_approved",
          actorName: "Aisha Admin",
          actorRole: "Admin",
          fromStatus: "pending",
          toStatus: "approved",
          metadata: {},
          note: undefined,
        });
      if (status === "fulfilled") {
        await tx
          .update(inventoryItems)
          .set({ quantityOnHand: 12 })
          .where(eq(inventoryItems.id, items[0].id));
        events.push({
          action: "stock_issued",
          actorName: "Aisha Admin",
          actorRole: "Admin",
          fromStatus: undefined,
          toStatus: undefined,
          metadata: { before: 13, after: 12, quantity: 1 },
          note: undefined,
        });
      }
      if (status !== "approved")
        events.push({
          action: `request_${status}`,
          actorName: "Aisha Admin",
          actorRole: "Admin",
          fromStatus: status === "fulfilled" ? "approved" : "pending",
          toStatus: status,
          metadata: {},
          note: request.adminComment ?? undefined,
        });
      for (const [eventIndex, event] of events.entries()) {
        const time = new Date(createdAt.getTime() + eventIndex * 1000);
        await tx.insert(requestHistory).values({
          ...event,
          workspaceId,
          requestId: request.id,
          createdAt: time,
        });
        await tx.insert(auditLogs).values({
          workspaceId,
          requestId: request.id,
          itemId: event.action === "stock_issued" ? items[0].id : null,
          actorName: event.actorName,
          action: event.action,
          fromStatus: event.fromStatus,
          toStatus: event.toStatus,
          metadata: event.metadata,
          createdAt: time,
        });
      }
    }
    return workspace;
  });
  return { workspace, token };
}

export async function deleteWorkspace(id: string) {
  await db.transaction(async (tx) => {
    await deleteWorkspaceRows(tx, [id]);
  });
}

export async function cleanupExpiredWorkspaces() {
  return db.transaction(async (tx) => {
    // A bounded bulk delete catches up faster than the 100/day creation limit.
    // Locks make overlapping cron/manual runs safe without touching live sessions.
    const expired = await tx
      .select({ id: demoWorkspaces.id })
      .from(demoWorkspaces)
      .where(lt(demoWorkspaces.expiresAt, new Date()))
      .orderBy(demoWorkspaces.expiresAt)
      .limit(200)
      .for("update", { skipLocked: true });
    if (expired.length)
      await deleteWorkspaceRows(
        tx,
        expired.map((row) => row.id),
      );
    await tx.execute(sql`delete from demo_rate_limits where resets_at < now()`);
    return expired.length;
  });
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function deleteWorkspaceRows(tx: Transaction, ids: string[]) {
  // Children first so every foreign key remains valid throughout cleanup.
  for (const table of [
    "request_history",
    "audit_logs",
    "inventory_request_items",
    "inventory_requests",
    "purchase_orders",
    "inventory_items",
    "suppliers",
    "warehouses",
    "users",
  ]) {
    await tx.execute(
      sql`delete from ${sql.identifier(table)} where workspace_id in (${sql.join(
        ids.map((id) => sql`${id}::uuid`),
        sql`, `,
      )})`,
    );
  }
  await tx.delete(demoWorkspaces).where(inArray(demoWorkspaces.id, ids));
}
