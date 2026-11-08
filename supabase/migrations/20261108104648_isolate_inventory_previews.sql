-- Preview-only objects. No production rows or credentials are copied.
CREATE ROLE inventory_preview_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 8;
GRANT inventory_preview_runtime TO postgres;
CREATE SCHEMA inventory_preview AUTHORIZATION inventory_preview_runtime;
REVOKE ALL ON SCHEMA inventory_preview FROM PUBLIC, anon, authenticated;
ALTER ROLE inventory_preview_runtime SET search_path = inventory_preview;
ALTER ROLE inventory_preview_runtime SET statement_timeout = '10s';
ALTER ROLE inventory_preview_runtime SET lock_timeout = '5s';
SET LOCAL ROLE inventory_preview_runtime;
SET LOCAL search_path = inventory_preview;
DO $$ BEGIN IF current_user <> 'inventory_preview_runtime' OR current_schema() <> 'inventory_preview' THEN RAISE EXCEPTION 'Wrong preview boundary'; END IF; END $$;
CREATE TYPE "inventory_preview"."request_status" AS ENUM('pending', 'approved', 'rejected', 'fulfilled');
CREATE TYPE "inventory_preview"."user_role" AS ENUM('employee', 'admin');
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid,
	"item_id" uuid,
	"actor_name" text NOT NULL,
	"action" text NOT NULL,
	"from_status" "request_status",
	"to_status" "request_status",
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"quantity_available" integer NOT NULL,
	"category" text NOT NULL,
	"low_stock_threshold" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_items_quantity_available_non_negative" CHECK ("inventory_items"."quantity_available" >= 0),
	CONSTRAINT "inventory_items_low_stock_threshold_non_negative" CHECK ("inventory_items"."low_stock_threshold" >= 0)
);

CREATE TABLE "inventory_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_name" text NOT NULL,
	"item_id" uuid NOT NULL,
	"quantity_requested" integer NOT NULL,
	"reason" text NOT NULL,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fulfilled_at" timestamp with time zone,
	CONSTRAINT "inventory_requests_quantity_requested_positive" CHECK ("inventory_requests"."quantity_requested" > 0)
);

CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_request_id_inventory_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "inventory_preview"."inventory_requests"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "inventory_preview"."inventory_items"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "inventory_requests" ADD CONSTRAINT "inventory_requests_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "inventory_preview"."inventory_items"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "audit_logs_request_id_idx" ON "audit_logs" USING btree ("request_id");
CREATE UNIQUE INDEX "inventory_items_sku_unique" ON "inventory_items" USING btree ("sku");
CREATE INDEX "inventory_items_category_idx" ON "inventory_items" USING btree ("category");
CREATE INDEX "inventory_requests_status_idx" ON "inventory_requests" USING btree ("status");
CREATE INDEX "inventory_requests_item_id_idx" ON "inventory_requests" USING btree ("item_id");

CREATE TYPE "inventory_preview"."request_priority" AS ENUM('low', 'normal', 'high');
ALTER TABLE "inventory_items" ADD COLUMN "warehouse" text DEFAULT 'Main Warehouse' NOT NULL;
ALTER TABLE "inventory_items" ADD COLUMN "unit" text DEFAULT 'Each' NOT NULL;
ALTER TABLE "inventory_items" ADD COLUMN "quantity_on_hand" integer;
ALTER TABLE "inventory_items" ADD COLUMN "quantity_reserved" integer DEFAULT 0 NOT NULL;
ALTER TABLE "inventory_items" ADD COLUMN "reorder_point" integer;
UPDATE "inventory_items"
SET
  "quantity_on_hand" = "quantity_available",
  "reorder_point" = "low_stock_threshold"
WHERE "quantity_on_hand" IS NULL OR "reorder_point" IS NULL;
ALTER TABLE "inventory_items" ALTER COLUMN "quantity_on_hand" SET NOT NULL;
ALTER TABLE "inventory_items" ALTER COLUMN "reorder_point" SET DEFAULT 5;
ALTER TABLE "inventory_items" ALTER COLUMN "reorder_point" SET NOT NULL;
ALTER TABLE "inventory_items" ALTER COLUMN "quantity_available" DROP NOT NULL;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_quantity_on_hand_non_negative" CHECK ("inventory_items"."quantity_on_hand" >= 0);
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_quantity_reserved_non_negative" CHECK ("inventory_items"."quantity_reserved" >= 0);
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_quantity_reserved_within_on_hand" CHECK ("inventory_items"."quantity_reserved" <= "inventory_items"."quantity_on_hand");
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_reorder_point_non_negative" CHECK ("inventory_items"."reorder_point" >= 0);
ALTER TABLE "inventory_requests" ADD COLUMN "requester_id" uuid;
ALTER TABLE "inventory_requests" ADD COLUMN "request_code" text;
ALTER TABLE "inventory_requests" ADD COLUMN "department" text DEFAULT 'General' NOT NULL;
ALTER TABLE "inventory_requests" ADD COLUMN "warehouse" text DEFAULT 'Main Warehouse' NOT NULL;
ALTER TABLE "inventory_requests" ADD COLUMN "required_by" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "inventory_requests" ADD COLUMN "priority" "request_priority" DEFAULT 'normal' NOT NULL;
ALTER TABLE "inventory_requests" ADD COLUMN "approver_id" uuid;
ALTER TABLE "inventory_requests" ADD COLUMN "admin_comment" text;
UPDATE "inventory_requests" request
SET
  "requester_id" = "users"."id",
  "request_code" = CONCAT('REQ-', LEFT(request."id"::text, 8))
FROM "users"
WHERE request."requester_name" = "users"."name"
AND request."requester_id" IS NULL;
UPDATE "inventory_requests"
SET "requester_id" = (SELECT "id" FROM "users" ORDER BY "created_at" LIMIT 1)
WHERE "requester_id" IS NULL;
ALTER TABLE "inventory_requests" ALTER COLUMN "requester_id" SET NOT NULL;
ALTER TABLE "inventory_requests" ALTER COLUMN "request_code" SET NOT NULL;
ALTER TABLE "inventory_requests" ALTER COLUMN "requester_name" DROP NOT NULL;
ALTER TABLE "inventory_requests" ALTER COLUMN "item_id" DROP NOT NULL;
ALTER TABLE "inventory_requests" ALTER COLUMN "quantity_requested" DROP NOT NULL;
ALTER TABLE "inventory_requests" ADD CONSTRAINT "inventory_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "inventory_preview"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "inventory_requests" ADD CONSTRAINT "inventory_requests_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "inventory_preview"."users"("id") ON DELETE no action ON UPDATE no action;
CREATE UNIQUE INDEX "inventory_requests_request_code_unique" ON "inventory_requests" USING btree ("request_code");
CREATE INDEX "inventory_requests_requester_id_idx" ON "inventory_requests" USING btree ("requester_id");
CREATE TABLE "inventory_request_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"quantity_requested" integer NOT NULL,
	"quantity_approved" integer,
	"unit" text NOT NULL,
	CONSTRAINT "inventory_request_items_quantity_requested_positive" CHECK ("inventory_request_items"."quantity_requested" > 0),
	CONSTRAINT "inventory_request_items_quantity_approved_non_negative" CHECK ("inventory_request_items"."quantity_approved" is null or "inventory_request_items"."quantity_approved" >= 0)
);
INSERT INTO "inventory_request_items" ("request_id", "item_id", "quantity_requested", "quantity_approved", "unit")
SELECT
  request."id",
  request."item_id",
  request."quantity_requested",
  CASE WHEN request."status" IN ('approved', 'fulfilled') THEN request."quantity_requested" ELSE NULL END,
  item."unit"
FROM "inventory_requests" request
JOIN "inventory_items" item ON item."id" = request."item_id";
ALTER TABLE "inventory_request_items" ADD CONSTRAINT "inventory_request_items_request_id_inventory_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "inventory_preview"."inventory_requests"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "inventory_request_items" ADD CONSTRAINT "inventory_request_items_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "inventory_preview"."inventory_items"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "inventory_request_items_request_id_idx" ON "inventory_request_items" USING btree ("request_id");
CREATE INDEX "inventory_request_items_item_id_idx" ON "inventory_request_items" USING btree ("item_id");

CREATE TABLE "warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "warehouses_name_unique" ON "warehouses" USING btree ("name");

ALTER TABLE "users" ADD COLUMN "department" text DEFAULT 'Operations' NOT NULL;
CREATE TABLE "suppliers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "contact_person" text NOT NULL,
  "email" text NOT NULL,
  "phone" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "suppliers_email_unique" ON "suppliers" USING btree ("email");
CREATE TABLE "purchase_orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "po_number" text NOT NULL,
  "supplier_id" uuid NOT NULL REFERENCES "suppliers"("id"),
  "warehouse_id" uuid NOT NULL REFERENCES "warehouses"("id"),
  "created_by_id" uuid NOT NULL REFERENCES "users"("id"),
  "order_date" timestamp with time zone NOT NULL,
  "expected_date" timestamp with time zone NOT NULL,
  "status" text NOT NULL,
  "total_items" integer NOT NULL
);

CREATE TABLE "request_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"actor_name" text NOT NULL,
	"actor_role" text NOT NULL,
	"action" text NOT NULL,
	"note" text,
	"from_status" "request_status",
	"to_status" "request_status",
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "request_history" ADD CONSTRAINT "request_history_request_id_inventory_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "inventory_preview"."inventory_requests"("id") ON DELETE no action ON UPDATE no action;

CREATE INDEX "request_history_request_id_idx" ON "request_history" USING btree ("request_id");

INSERT INTO "request_history" (
	"request_id",
	"actor_name",
	"actor_role",
	"action",
	"note",
	"from_status",
	"to_status",
	"metadata",
	"created_at"
)
SELECT
	"request_id",
	"actor_name",
	CASE
		WHEN "actor_name" = 'System' THEN 'System'
		WHEN "action" = 'request_created' THEN 'Employee'
		ELSE 'Admin'
	END,
	"action",
	"metadata"->>'comment',
	"from_status",
	"to_status",
	"metadata",
	"created_at"
FROM "audit_logs"
WHERE "request_id" IS NOT NULL;

CREATE TABLE demo_workspaces (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token_hash text UNIQUE,
 role user_role NOT NULL DEFAULT 'employee',
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO demo_workspaces (id, expires_at) VALUES ('00000000-0000-0000-0000-000000000000', 'infinity');
CREATE TABLE demo_rate_limits (key text PRIMARY KEY, count integer NOT NULL, resets_at timestamptz NOT NULL);
ALTER TABLE users ADD COLUMN workspace_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES demo_workspaces(id);
CREATE INDEX users_workspace_idx ON users(workspace_id);
CREATE UNIQUE INDEX users_workspace_id_unique ON users(workspace_id,id);
ALTER TABLE warehouses ADD COLUMN workspace_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES demo_workspaces(id);
CREATE INDEX warehouses_workspace_idx ON warehouses(workspace_id);
CREATE UNIQUE INDEX warehouses_workspace_id_unique ON warehouses(workspace_id,id);
ALTER TABLE suppliers ADD COLUMN workspace_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES demo_workspaces(id);
CREATE INDEX suppliers_workspace_idx ON suppliers(workspace_id);
CREATE UNIQUE INDEX suppliers_workspace_id_unique ON suppliers(workspace_id,id);
ALTER TABLE purchase_orders ADD COLUMN workspace_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES demo_workspaces(id);
CREATE INDEX purchase_orders_workspace_idx ON purchase_orders(workspace_id);
CREATE UNIQUE INDEX purchase_orders_workspace_id_unique ON purchase_orders(workspace_id,id);
ALTER TABLE inventory_items ADD COLUMN workspace_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES demo_workspaces(id);
CREATE INDEX inventory_items_workspace_idx ON inventory_items(workspace_id);
CREATE UNIQUE INDEX inventory_items_workspace_id_unique ON inventory_items(workspace_id,id);
ALTER TABLE inventory_requests ADD COLUMN workspace_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES demo_workspaces(id);
CREATE INDEX inventory_requests_workspace_idx ON inventory_requests(workspace_id);
CREATE UNIQUE INDEX inventory_requests_workspace_id_unique ON inventory_requests(workspace_id,id);
ALTER TABLE inventory_request_items ADD COLUMN workspace_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES demo_workspaces(id);
CREATE INDEX inventory_request_items_workspace_idx ON inventory_request_items(workspace_id);
CREATE UNIQUE INDEX inventory_request_items_workspace_id_unique ON inventory_request_items(workspace_id,id);
ALTER TABLE audit_logs ADD COLUMN workspace_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES demo_workspaces(id);
CREATE INDEX audit_logs_workspace_idx ON audit_logs(workspace_id);
CREATE UNIQUE INDEX audit_logs_workspace_id_unique ON audit_logs(workspace_id,id);
ALTER TABLE request_history ADD COLUMN workspace_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES demo_workspaces(id);
CREATE INDEX request_history_workspace_idx ON request_history(workspace_id);
CREATE UNIQUE INDEX request_history_workspace_id_unique ON request_history(workspace_id,id);
DROP INDEX warehouses_name_unique;
CREATE UNIQUE INDEX warehouses_name_unique ON warehouses(workspace_id,name);
DROP INDEX suppliers_email_unique;
CREATE UNIQUE INDEX suppliers_email_unique ON suppliers(workspace_id,email);
DROP INDEX inventory_items_sku_unique;
CREATE UNIQUE INDEX inventory_items_sku_unique ON inventory_items(workspace_id,sku);
DROP INDEX inventory_requests_request_code_unique;
CREATE UNIQUE INDEX inventory_requests_request_code_unique ON inventory_requests(workspace_id,request_code);
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_supplier_id_workspace_fk FOREIGN KEY (workspace_id,supplier_id) REFERENCES suppliers(workspace_id,id);
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_warehouse_id_workspace_fk FOREIGN KEY (workspace_id,warehouse_id) REFERENCES warehouses(workspace_id,id);
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_created_by_id_workspace_fk FOREIGN KEY (workspace_id,created_by_id) REFERENCES users(workspace_id,id);
ALTER TABLE inventory_requests ADD CONSTRAINT inventory_requests_requester_id_workspace_fk FOREIGN KEY (workspace_id,requester_id) REFERENCES users(workspace_id,id);
ALTER TABLE inventory_requests ADD CONSTRAINT inventory_requests_approver_id_workspace_fk FOREIGN KEY (workspace_id,approver_id) REFERENCES users(workspace_id,id);
ALTER TABLE inventory_request_items ADD CONSTRAINT inventory_request_items_request_id_workspace_fk FOREIGN KEY (workspace_id,request_id) REFERENCES inventory_requests(workspace_id,id);
ALTER TABLE inventory_request_items ADD CONSTRAINT inventory_request_items_item_id_workspace_fk FOREIGN KEY (workspace_id,item_id) REFERENCES inventory_items(workspace_id,id);
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_request_id_workspace_fk FOREIGN KEY (workspace_id,request_id) REFERENCES inventory_requests(workspace_id,id);
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_item_id_workspace_fk FOREIGN KEY (workspace_id,item_id) REFERENCES inventory_items(workspace_id,id);
ALTER TABLE request_history ADD CONSTRAINT request_history_request_id_workspace_fk FOREIGN KEY (workspace_id,request_id) REFERENCES inventory_requests(workspace_id,id);

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "demo_rate_limits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_request_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "request_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "warehouses" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "demo_workspaces" ENABLE ROW LEVEL SECURITY;

RESET ROLE;
