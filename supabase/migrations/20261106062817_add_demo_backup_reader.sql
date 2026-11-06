-- Shared-project operational role. Provision its password separately via the admin connection.
BEGIN;
CREATE ROLE inventory_demo_backup NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
ALTER ROLE inventory_demo_backup SET search_path = inventory_demo;
GRANT USAGE ON SCHEMA inventory_demo TO inventory_demo_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA inventory_demo TO inventory_demo_backup;
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users','inventory_items','inventory_requests','inventory_request_items',
    'suppliers','purchase_orders','warehouses','audit_logs','request_history',
    'demo_workspaces','demo_rate_limits'
  ] LOOP
    EXECUTE format('CREATE POLICY backup_export ON inventory_demo.%I FOR SELECT TO inventory_demo_backup USING (true)', table_name);
  END LOOP;
END $$;
COMMIT;
