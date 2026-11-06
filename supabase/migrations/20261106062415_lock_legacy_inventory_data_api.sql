-- Hosted shared-project hardening only. Not part of the standalone Drizzle chain.
-- Existing legacy tables are accessed through server-side owner connections.
BEGIN;
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users', 'inventory_items', 'inventory_requests', 'inventory_request_items',
    'suppliers', 'purchase_orders', 'warehouses', 'audit_logs', 'request_history'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', table_name);
  END LOOP;
END $$;
-- This event trigger is maintained by postgres, not called by API clients.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
COMMIT;
