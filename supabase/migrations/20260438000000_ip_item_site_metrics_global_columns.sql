-- Fill global_in_stock, global_sent, global_returns on ip_get_item_site_metrics so expanded
-- site rows match item-level semantics (central pool, units sent to this site, study-wide returns).

CREATE OR REPLACE FUNCTION public.ip_get_item_site_metrics(
  p_study_id UUID,
  p_item_id UUID,
  p_include_archived BOOLEAN DEFAULT FALSE
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
      AND (
        (COALESCE(p_include_archived, FALSE) AND lnk.deleted_at IS NOT NULL)
        OR (NOT COALESCE(p_include_archived, FALSE) AND lnk.deleted_at IS NULL)
      )
  ),
  item_central AS (
    SELECT COALESCE(SUM(ill.quantity_on_hand), 0)::BIGINT AS qty
    FROM public.ip_lot_locations ill
    JOIN public.ip_lots l ON l.id = ill.lot_id
    WHERE ill.study_id = p_study_id
      AND ill.study_site_id IS NULL
      AND l.item_id = p_item_id
  ),
  item_returns_study AS (
    SELECT COALESCE(SUM(e.quantity_delta), 0)::BIGINT AS qty
    FROM public.ip_ledger_entries e
    JOIN public.ip_lots l ON l.id = e.lot_id
    WHERE e.study_id = p_study_id
      AND l.item_id = p_item_id
      AND e.entry_type = 'returned_to_global'
      AND COALESCE(e.metadata->>'dispatch_mirror', '') <> 'true'
  ),
  orders_cnt AS (
    SELECT o.study_site_id AS sid, COUNT(*)::BIGINT AS cnt
    FROM public.ip_orders o
    WHERE o.study_id = p_study_id
      AND o.item_id  = p_item_id
      AND o.deleted_at IS NULL
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
      SUM(CASE WHEN e.entry_type = 'shipped_to_site' AND e.to_study_site_id = ls.sid THEN e.quantity_delta ELSE 0 END)::BIGINT AS sent_to_site,
      SUM(CASE WHEN e.entry_type = 'received_at_site'  AND e.to_study_site_id   = ls.sid
                    AND e.metadata->>'system_fulfillment' IS DISTINCT FROM 'true'
               THEN e.quantity_delta ELSE 0 END)::BIGINT AS shipments_received,
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
      AND COALESCE(e.metadata->>'dispatch_mirror', '') <> 'true'
    GROUP BY ls.sid
  )
  SELECT
    ls.sid,
    ls.site_number,
    ls.site_name,
    GREATEST(COALESCE(oc.cnt, 0), COALESCE(llc.cnt, 0))::BIGINT,
    (SELECT qty FROM item_central),
    COALESCE(sl.sent_to_site, 0)::BIGINT,
    (SELECT qty FROM item_returns_study),
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

COMMENT ON FUNCTION public.ip_get_item_site_metrics(UUID, UUID, BOOLEAN) IS
'Per-site metrics: global_* columns populated (central pool, units shipped to this site, study-wide returns). site_shipments = operator receipts only.';
