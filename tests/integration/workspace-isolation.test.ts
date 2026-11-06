import { describe, it, expect } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { scopedClient } from "@/db/scoped";
import { createWorkspace, deleteWorkspace } from "@/lib/demo-session";
import {
  inventoryItems,
  inventoryRequests,
  inventoryRequestItems,
  users,
} from "@/db/schema";

describe("workspace ownership", () => {
  it("scopes reads, filters, inserts, updates, deletes and relationships", async () => {
    const a = await createWorkspace();
    const b = await createWorkspace();
    const clientA = scopedClient(
      db as unknown as Record<string, unknown>,
      a.workspace.id,
    );
    const clientB = scopedClient(
      db as unknown as Record<string, unknown>,
      b.workspace.id,
    );
    try {
      const itemsA = await clientA.select().from(inventoryItems);
      const itemsB = await clientB.select().from(inventoryItems);
      expect(itemsA).toHaveLength(3);
      expect(itemsB).toHaveLength(3);
      expect(
        await clientA
          .select()
          .from(inventoryItems)
          .where(eq(inventoryItems.id, itemsB[0].id)),
      ).toEqual([]);
      expect(
        await clientA
          .update(inventoryItems)
          .set({ quantityOnHand: 100 })
          .where(eq(inventoryItems.id, itemsB[0].id))
          .returning(),
      ).toEqual([]);
      expect(
        await clientA
          .delete(inventoryItems)
          .where(eq(inventoryItems.id, itemsB[0].id))
          .returning(),
      ).toEqual([]);
      const [inserted] = await clientA
        .insert(inventoryItems)
        .values({
          workspaceId: b.workspace.id,
          name: "Owned item",
          sku: "NEW",
          category: "Test",
          quantityOnHand: 1,
        })
        .returning();
      expect(inserted.workspaceId).toBe(a.workspace.id);
      const [request] = await clientA.select().from(inventoryRequests);
      await expect(
        clientA.insert(inventoryRequestItems).values({
          requestId: request.id,
          itemId: itemsB[0].id,
          quantityRequested: 1,
          unit: "Box",
        }),
      ).rejects.toThrow();
      const joined = await clientA
        .select()
        .from(inventoryRequests)
        .innerJoin(users, eq(inventoryRequests.requesterId, users.id));
      expect(joined).toHaveLength(7);
      expect(
        joined.every((row) => row.users.workspaceId === a.workspace.id),
      ).toBe(true);
      await deleteWorkspace(a.workspace.id);
      expect(await clientB.select().from(inventoryItems)).toHaveLength(3);
    } finally {
      await deleteWorkspace(a.workspace.id);
      await deleteWorkspace(b.workspace.id);
    }
  });
  it("hides all public demo tables from an unprivileged Data API role", async () => {
    await db.execute(sql`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='inventory_demo_public_test') THEN
        CREATE ROLE inventory_demo_public_test NOLOGIN;
      END IF;
    END $$;
    GRANT USAGE ON SCHEMA public TO inventory_demo_public_test;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO inventory_demo_public_test;`);
    const session = await createWorkspace();
    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL ROLE inventory_demo_public_test`);
        expect(await tx.select().from(users)).toEqual([]);
        expect(await tx.select().from(inventoryRequests)).toEqual([]);
        expect(await tx.select().from(inventoryItems)).toEqual([]);
      });
    } finally {
      await deleteWorkspace(session.workspace.id);
    }
  });
});
