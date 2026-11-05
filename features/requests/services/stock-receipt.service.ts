import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getScopedDb, limitMutation } from "@/db/scoped";
import {
  auditLogs,
  inventoryItems,
  inventoryRequestItems,
  inventoryRequests,
  type User,
} from "@/db/schema";
import { assertAdminRole } from "@/lib/auth";
import { DomainError, NotFoundError } from "@/lib/errors";
import { createAuditLog } from "@/services/audit.service";

const receiptSchema = z.object({
  key: z.string().uuid(),
  requestId: z.string().uuid(),
  itemId: z.string().uuid(),
  quantity: z.coerce.number().int().positive().max(1_000_000),
  reason: z.string().trim().min(1).max(500),
});

export async function recordStockReceived(input: unknown, actor: User) {
  assertAdminRole(actor.role);
  await limitMutation();
  const receipt = receiptSchema.parse(input);
  return (await getScopedDb()).transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${receipt.key}, 0))`,
    );
    const [existing] = await tx
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.id, receipt.key));
    if (existing) {
      if (
        existing.action !== "stock_received" ||
        existing.itemId !== receipt.itemId ||
        existing.requestId !== receipt.requestId ||
        existing.metadata.quantity !== receipt.quantity ||
        existing.metadata.reason !== receipt.reason ||
        existing.metadata.actorId !== actor.id
      ) {
        throw new DomainError(
          "This receipt key has already been used for another delivery.",
        );
      }
      return existing;
    }
    const [request] = await tx
      .select()
      .from(inventoryRequests)
      .where(eq(inventoryRequests.id, receipt.requestId))
      .for("update");
    if (!request || request.status !== "approved") {
      throw new DomainError(
        "Stock can be received here for an approved request.",
      );
    }
    const [line] = await tx
      .select()
      .from(inventoryRequestItems)
      .where(
        and(
          eq(inventoryRequestItems.requestId, receipt.requestId),
          eq(inventoryRequestItems.itemId, receipt.itemId),
        ),
      );
    if (!line) throw new NotFoundError("Requested item was not found.");
    const [item] = await tx
      .update(inventoryItems)
      .set({
        quantityOnHand: sql`${inventoryItems.quantityOnHand} + ${receipt.quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, receipt.itemId))
      .returning();
    if (!item) throw new NotFoundError("Inventory item was not found.");
    return createAuditLog(tx, {
      id: receipt.key,
      requestId: receipt.requestId,
      itemId: receipt.itemId,
      actorName: actor.name,
      actorRole: "Admin",
      action: "stock_received",
      note: receipt.reason,
      metadata: {
        quantity: receipt.quantity,
        before: item.quantityOnHand - receipt.quantity,
        after: item.quantityOnHand,
        reason: receipt.reason,
        actorId: actor.id,
      },
    });
  });
}
