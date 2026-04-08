-- Fix order_count in ip_get_item_site_metrics: use GREATEST of ip_orders count
-- and ip_lot_locations count so pre-existing lot data is reflected even when
-- no explicit ip_orders rows have item_id set.

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
  lot_loc_cnt AS (
    SELECT ill.study_site_id AS sid, COUNT(*)::BIGINT AS cnt
    FROM public.ip_lot_locations ill
    JOIN public.ip_lots l ON l.id = ill.lot_id
    WHERE ill.study_id      = p_study_id
      AND l.item_id         = p_item_id
      AND ill.study_site_id IS NOT NULL
    GROUP BY ill.study_site_id
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
    GREATEST(COALESCE(oc.cnt, 0), COALESCE(llc.cnt, 0))::BIGINT,
    0::BIGINT,
    0::BIGINT,
    0::BIGINT,
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
  LEFT JOIN lot_loc_cnt llc  ON llc.sid  = ls.sid
  LEFT JOIN site_ledger sl   ON sl.sid   = ls.sid
  LEFT JOIN site_loc    sloc ON sloc.sid = ls.sid;
$$;
