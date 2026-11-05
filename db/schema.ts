import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["employee", "admin"]);
export const requestStatusEnum = pgEnum("request_status", [
  "pending",
  "approved",
  "rejected",
  "fulfilled",
]);
export const requestPriorityEnum = pgEnum("request_priority", [
  "low",
  "normal",
  "high",
]);

export const LEGACY_WORKSPACE_ID = "00000000-0000-0000-0000-000000000000";
export const demoWorkspaces = pgTable("demo_workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenHash: text("token_hash").unique(),
  role: userRoleEnum("role").default("employee").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}).enableRLS();
export const demoRateLimits = pgTable("demo_rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetsAt: timestamp("resets_at", { withTimezone: true }).notNull(),
}).enableRLS();
const ownership = () =>
  uuid("workspace_id")
    .notNull()
    .default(LEGACY_WORKSPACE_ID)
    .references(() => demoWorkspaces.id);

export const users = pgTable(
  "users",
  {
    workspaceId: ownership(),
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: userRoleEnum("role").notNull(),
    department: text("department").default("Operations").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workspaceIdUnique: uniqueIndex("users_workspace_id_unique").on(
      table.workspaceId,
      table.id,
    ),
    workspaceIdx: index("users_workspace_idx").on(table.workspaceId),
  }),
).enableRLS();

export const warehouses = pgTable(
  "warehouses",
  {
    workspaceId: ownership(),
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workspaceIdUnique: uniqueIndex("warehouses_workspace_id_unique").on(
      table.workspaceId,
      table.id,
    ),
    workspaceIdx: index("warehouses_workspace_idx").on(table.workspaceId),

    nameUnique: uniqueIndex("warehouses_name_unique").on(
      table.workspaceId,
      table.name,
    ),
  }),
).enableRLS();

export const suppliers = pgTable(
  "suppliers",
  {
    workspaceId: ownership(),
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    contactPerson: text("contact_person").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    status: text("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workspaceIdUnique: uniqueIndex("suppliers_workspace_id_unique").on(
      table.workspaceId,
      table.id,
    ),
    workspaceIdx: index("suppliers_workspace_idx").on(table.workspaceId),

    emailUnique: uniqueIndex("suppliers_email_unique").on(
      table.workspaceId,
      table.email,
    ),
  }),
).enableRLS();

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    workspaceId: ownership(),
    id: uuid("id").defaultRandom().primaryKey(),
    poNumber: text("po_number").notNull(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id),
    orderDate: timestamp("order_date", { withTimezone: true }).notNull(),
    expectedDate: timestamp("expected_date", { withTimezone: true }).notNull(),
    status: text("status").notNull(),
    totalItems: integer("total_items").notNull(),
  },
  (table) => ({
    workspaceIdUnique: uniqueIndex("purchase_orders_workspace_id_unique").on(
      table.workspaceId,
      table.id,
    ),
    workspaceIdx: index("purchase_orders_workspace_idx").on(table.workspaceId),
    supplierIdWorkspace: foreignKey({
      name: "purchase_orders_supplier_id_workspace_fk",
      columns: [table.workspaceId, table.supplierId],
      foreignColumns: [suppliers.workspaceId, suppliers.id],
    }),
    warehouseIdWorkspace: foreignKey({
      name: "purchase_orders_warehouse_id_workspace_fk",
      columns: [table.workspaceId, table.warehouseId],
      foreignColumns: [warehouses.workspaceId, warehouses.id],
    }),
    createdByIdWorkspace: foreignKey({
      name: "purchase_orders_created_by_id_workspace_fk",
      columns: [table.workspaceId, table.createdById],
      foreignColumns: [users.workspaceId, users.id],
    }),
  }),
).enableRLS();

export const inventoryItems = pgTable(
  "inventory_items",
  {
    workspaceId: ownership(),
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    sku: text("sku").notNull(),
    category: text("category").notNull(),
    warehouse: text("warehouse").default("Main Warehouse").notNull(),
    unit: text("unit").default("Each").notNull(),
    quantityOnHand: integer("quantity_on_hand").notNull(),
    quantityReserved: integer("quantity_reserved").default(0).notNull(),
    reorderPoint: integer("reorder_point").default(5).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workspaceIdUnique: uniqueIndex("inventory_items_workspace_id_unique").on(
      table.workspaceId,
      table.id,
    ),
    workspaceIdx: index("inventory_items_workspace_idx").on(table.workspaceId),

    skuUnique: uniqueIndex("inventory_items_sku_unique").on(
      table.workspaceId,
      table.sku,
    ),
    categoryIdx: index("inventory_items_category_idx").on(table.category),
    onHandNonNegative: check(
      "inventory_items_quantity_on_hand_non_negative",
      sql`${table.quantityOnHand} >= 0`,
    ),
    reservedNonNegative: check(
      "inventory_items_quantity_reserved_non_negative",
      sql`${table.quantityReserved} >= 0`,
    ),
    reservedWithinOnHand: check(
      "inventory_items_quantity_reserved_within_on_hand",
      sql`${table.quantityReserved} <= ${table.quantityOnHand}`,
    ),
    reorderPointNonNegative: check(
      "inventory_items_reorder_point_non_negative",
      sql`${table.reorderPoint} >= 0`,
    ),
  }),
).enableRLS();

export const inventoryRequests = pgTable(
  "inventory_requests",
  {
    workspaceId: ownership(),
    id: uuid("id").defaultRandom().primaryKey(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id),
    requestCode: text("request_code").notNull(),
    department: text("department").notNull(),
    warehouse: text("warehouse").notNull(),
    requiredBy: timestamp("required_by", { withTimezone: true }).notNull(),
    priority: requestPriorityEnum("priority").default("normal").notNull(),
    reason: text("reason").notNull(),
    status: requestStatusEnum("status").default("pending").notNull(),
    approverId: uuid("approver_id").references(() => users.id),
    adminComment: text("admin_comment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
  },
  (table) => ({
    workspaceIdUnique: uniqueIndex("inventory_requests_workspace_id_unique").on(
      table.workspaceId,
      table.id,
    ),
    workspaceIdx: index("inventory_requests_workspace_idx").on(
      table.workspaceId,
    ),
    requesterIdWorkspace: foreignKey({
      name: "inventory_requests_requester_id_workspace_fk",
      columns: [table.workspaceId, table.requesterId],
      foreignColumns: [users.workspaceId, users.id],
    }),
    approverIdWorkspace: foreignKey({
      name: "inventory_requests_approver_id_workspace_fk",
      columns: [table.workspaceId, table.approverId],
      foreignColumns: [users.workspaceId, users.id],
    }),

    statusIdx: index("inventory_requests_status_idx").on(table.status),
    requesterIdx: index("inventory_requests_requester_id_idx").on(
      table.requesterId,
    ),
    requestCodeUnique: uniqueIndex("inventory_requests_request_code_unique").on(
      table.workspaceId,
      table.requestCode,
    ),
  }),
).enableRLS();

export const inventoryRequestItems = pgTable(
  "inventory_request_items",
  {
    workspaceId: ownership(),
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => inventoryRequests.id),
    itemId: uuid("item_id")
      .notNull()
      .references(() => inventoryItems.id),
    quantityRequested: integer("quantity_requested").notNull(),
    quantityApproved: integer("quantity_approved"),
    unit: text("unit").notNull(),
  },
  (table) => ({
    workspaceIdUnique: uniqueIndex(
      "inventory_request_items_workspace_id_unique",
    ).on(table.workspaceId, table.id),
    workspaceIdx: index("inventory_request_items_workspace_idx").on(
      table.workspaceId,
    ),
    requestIdWorkspace: foreignKey({
      name: "inventory_request_items_request_id_workspace_fk",
      columns: [table.workspaceId, table.requestId],
      foreignColumns: [inventoryRequests.workspaceId, inventoryRequests.id],
    }),
    itemIdWorkspace: foreignKey({
      name: "inventory_request_items_item_id_workspace_fk",
      columns: [table.workspaceId, table.itemId],
      foreignColumns: [inventoryItems.workspaceId, inventoryItems.id],
    }),

    requestIdx: index("inventory_request_items_request_id_idx").on(
      table.requestId,
    ),
    itemIdx: index("inventory_request_items_item_id_idx").on(table.itemId),
    quantityRequestedPositive: check(
      "inventory_request_items_quantity_requested_positive",
      sql`${table.quantityRequested} > 0`,
    ),
    quantityApprovedNonNegative: check(
      "inventory_request_items_quantity_approved_non_negative",
      sql`${table.quantityApproved} is null or ${table.quantityApproved} >= 0`,
    ),
  }),
).enableRLS();

export const auditLogs = pgTable(
  "audit_logs",
  {
    workspaceId: ownership(),
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id").references(() => inventoryRequests.id),
    itemId: uuid("item_id").references(() => inventoryItems.id),
    actorName: text("actor_name").notNull(),
    action: text("action").notNull(),
    fromStatus: requestStatusEnum("from_status"),
    toStatus: requestStatusEnum("to_status"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workspaceIdUnique: uniqueIndex("audit_logs_workspace_id_unique").on(
      table.workspaceId,
      table.id,
    ),
    workspaceIdx: index("audit_logs_workspace_idx").on(table.workspaceId),
    requestIdWorkspace: foreignKey({
      name: "audit_logs_request_id_workspace_fk",
      columns: [table.workspaceId, table.requestId],
      foreignColumns: [inventoryRequests.workspaceId, inventoryRequests.id],
    }),
    itemIdWorkspace: foreignKey({
      name: "audit_logs_item_id_workspace_fk",
      columns: [table.workspaceId, table.itemId],
      foreignColumns: [inventoryItems.workspaceId, inventoryItems.id],
    }),

    requestIdx: index("audit_logs_request_id_idx").on(table.requestId),
  }),
).enableRLS();

export const requestHistory = pgTable(
  "request_history",
  {
    workspaceId: ownership(),
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => inventoryRequests.id),
    actorName: text("actor_name").notNull(),
    actorRole: text("actor_role").notNull(),
    action: text("action").notNull(),
    note: text("note"),
    fromStatus: requestStatusEnum("from_status"),
    toStatus: requestStatusEnum("to_status"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workspaceIdUnique: uniqueIndex("request_history_workspace_id_unique").on(
      table.workspaceId,
      table.id,
    ),
    workspaceIdx: index("request_history_workspace_idx").on(table.workspaceId),
    requestIdWorkspace: foreignKey({
      name: "request_history_request_id_workspace_fk",
      columns: [table.workspaceId, table.requestId],
      foreignColumns: [inventoryRequests.workspaceId, inventoryRequests.id],
    }),

    requestIdx: index("request_history_request_id_idx").on(table.requestId),
  }),
).enableRLS();

export type User = typeof users.$inferSelect;
export type Warehouse = typeof warehouses.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InventoryRequest = typeof inventoryRequests.$inferSelect;
export type InventoryRequestItem = typeof inventoryRequestItems.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type RequestHistory = typeof requestHistory.$inferSelect;
