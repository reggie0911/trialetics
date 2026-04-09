-- Optional per-order JSON (e.g. contents_per_catalog_unit: tablets per bottle for investigational drugs).
ALTER TABLE public.ip_orders
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.ip_orders.metadata IS
  'Optional key/value data. Known keys: contents_per_catalog_unit (integer, inner units per catalog unit such as tablets per bottle).';
