-- Add min_stock_threshold to ip_items for low-stock alerting.
-- When global_in_stock + site_onsite drops below this value the UI shows a warning.

ALTER TABLE public.ip_items
  ADD COLUMN IF NOT EXISTS min_stock_threshold INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.ip_items.min_stock_threshold IS
  'Optional minimum stock level. UI surfaces a warning when total on-hand falls below this value.';
