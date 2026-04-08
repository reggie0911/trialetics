-- Extend ip_orders with item_id and lot_id for hierarchical inventory table.
-- Create ip_get_item_site_metrics RPC for site-level metrics per item.

-- 1a. Add item_id and lot_id to ip_orders
ALTER TABLE public.ip_orders
  ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES public.ip_items(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS lot_id  UUID REFERENCES public.ip_lots(id)  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ip_orders_item_site
  ON public.ip_orders(item_id, study_site_id);

-- 1b. ip_get_item_site_metrics: per-site metrics for a single catalog item.
CREATE OR REPLACE FUNCTION public.ip_get_item_site_metrics(
  p_study_id UUID,
  p_item_id  UUID
) RETURNS TABLE (
  study_site_id   UUID,
  site_number     TEXT,
  site_name       TEXT,
  order_count     BIGINT,
  global_in_stock BIGINT,
  global_sent     BIGINT,
  global_returns  BIGINT,
  site_in_transit BIGINT,
  site_shipments  BIGINT,
  site_returned   BIGINT,
  site_used       BIGINT,
  site_transfers  BIGINT,
  site_destroyed  BIGINT,
  site_onsite     BIGINT,
  site_available  BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH linked_sites AS (
    SELECT lnk.study_site_id AS sid,
           ss.site_number,
           ss.name AS site_name
    FROM public.ip_item_site_links lnk
    JOIN public.study_sites ss ON ss.id = lnk.study_site_id
    WHERE lnk.study_id = p_study_id
      AND lnk.item_id  = p_item_id
  ),
  orders_cnt AS (
    SELECT o.study_site_id AS sid, COUNT(*)::BIGINT AS cnt
    FROM public.ip_orders o
    WHERE o.study_id = p_study_id
      AND o.item_id  = p_item_id
    GROUP BY o.study_site_id
  ),
  site_loc AS (
    SELECT ill.study_site_id AS sid,
           SUM(ill.quantity_on_hand)::BIGINT  AS onsite,
           SUM(ill.quantity_available)::BIGINT AS avail
    FROM public.ip_lot_locations ill
    JOIN public.ip_lots l ON l.id = ill.lot_id
    WHERE ill.study_id      = p_study_id
      AND l.item_id         = p_item_id
      AND ill.study_site_id IS NOT NULL
    GROUP BY ill.study_site_id
  ),
  site_ledger AS (
    SELECT
      ls.sid,
      (
        SUM(CASE WHEN e.entry_type = 'shipped_to_site'   AND e.to_study_site_id   = ls.sid THEN e.quantity_delta ELSE 0 END)
        - SUM(CASE WHEN e.entry_type = 'received_at_site' AND e.to_study_site_id   = ls.sid THEN e.quantity_delta ELSE 0 END)
      )::BIGINT AS in_transit,
      SUM(CASE WHEN e.entry_type = 'received_at_site'  AND e.to_study_site_id   = ls.sid THEN e.quantity_delta ELSE 0 END)::BIGINT AS shipments_received,
      SUM(CASE WHEN e.entry_type = 'returned_to_global' AND e.from_study_site_id = ls.sid THEN e.quantity_delta ELSE 0 END)::BIGINT AS returned,
      SUM(CASE WHEN e.entry_type = 'dispensed'           AND e.from_study_site_id = ls.sid THEN -e.quantity_delta ELSE 0 END)::BIGINT AS used_amt,
      SUM(CASE WHEN e.entry_type IN ('transferred_out','transferred_in')
                    AND (e.from_study_site_id = ls.sid OR e.to_study_site_id = ls.sid)
               THEN ABS(e.quantity_delta) ELSE 0 END)::BIGINT / 2 AS transfers,
      SUM(CASE WHEN e.entry_type = 'destroyed' AND e.from_study_site_id = ls.sid THEN -e.quantity_delta ELSE 0 END)::BIGINT AS destroyed_amt
    FROM linked_sites ls
    CROSS JOIN public.ip_ledger_entries e
    JOIN public.ip_lots l ON l.id = e.lot_id
    WHERE e.study_id = p_study_id
      AND l.item_id  = p_item_id
    GROUP BY ls.sid
  )
  SELECT
    ls.sid,
    ls.site_number,
    ls.site_name,
    COALESCE(oc.cnt, 0)::BIGINT,
    0::BIGINT,  -- global_in_stock (not applicable at site level)
    0::BIGINT,  -- global_sent
    0::BIGINT,  -- global_returns
    GREATEST(0, COALESCE(sl.in_transit, 0))::BIGINT,
    COALESCE(sl.shipments_received, 0)::BIGINT,
    COALESCE(sl.returned, 0)::BIGINT,
    COALESCE(sl.used_amt, 0)::BIGINT,
    COALESCE(sl.transfers, 0)::BIGINT,
    COALESCE(sl.destroyed_amt, 0)::BIGINT,
    COALESCE(sloc.onsite, 0)::BIGINT,
    COALESCE(sloc.avail, 0)::BIGINT
  FROM linked_sites ls
  LEFT JOIN orders_cnt  oc   ON oc.sid   = ls.sid
  LEFT JOIN site_ledger sl   ON sl.sid   = ls.sid
  LEFT JOIN site_loc    sloc ON sloc.sid = ls.sid;
$$;

COMMENT ON FUNCTION public.ip_get_item_site_metrics IS
'Per-site inventory metrics for a single catalog item. Returns one row per linked site with order count and the 11 numeric inventory columns scoped to that site.';

GRANT EXECUTE ON FUNCTION public.ip_get_item_site_metrics(UUID, UUID) TO authenticated;
