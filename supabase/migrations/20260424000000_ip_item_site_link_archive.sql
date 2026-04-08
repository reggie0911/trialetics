-- Soft archive / restore for catalog item ↔ site links (ip_item_site_links).

ALTER TABLE public.ip_item_site_links
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.ip_item_site_links.deleted_at IS
  'When set, the item is no longer associated with this site in default UI. Orders and ledger rows are retained.';

CREATE INDEX IF NOT EXISTS idx_ip_item_site_links_study_item_archived
  ON public.ip_item_site_links (study_id, item_id)
  WHERE deleted_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- ip_get_item_site_metrics: third arg p_include_archived (default false)
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.ip_get_item_site_metrics(UUID, UUID);

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

COMMENT ON FUNCTION public.ip_get_item_site_metrics IS
'Per-site metrics for one catalog item. Pass p_include_archived true to list only archived site links; default false lists active links only.';

GRANT EXECUTE ON FUNCTION public.ip_get_item_site_metrics(UUID, UUID, BOOLEAN) TO authenticated;

-- ---------------------------------------------------------------------------
-- Archive / restore site link
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ip_archive_item_site_link(
  p_study_id UUID,
  p_item_id UUID,
  p_study_site_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orders BIGINT;
  v_loc_qty BIGINT;
  v_transit BIGINT;
BEGIN
  PERFORM public.ip_assert_study_company(p_study_id);

  IF NOT EXISTS (
    SELECT 1 FROM public.ip_item_site_links lnk
    WHERE lnk.study_id = p_study_id
      AND lnk.item_id = p_item_id
      AND lnk.study_site_id = p_study_site_id
      AND lnk.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Active site link not found';
  END IF;

  SELECT COUNT(*)::BIGINT INTO v_orders
  FROM public.ip_orders o
  WHERE o.study_id = p_study_id
    AND o.item_id = p_item_id
    AND o.study_site_id = p_study_site_id;

  IF COALESCE(v_orders, 0) > 0 THEN
    RAISE EXCEPTION 'Cannot remove site link while orders exist for this site. Delete or resolve orders first.';
  END IF;

  SELECT COALESCE(SUM(ill.quantity_on_hand), 0)::BIGINT INTO v_loc_qty
  FROM public.ip_lot_locations ill
  JOIN public.ip_lots l ON l.id = ill.lot_id
  WHERE l.item_id = p_item_id
    AND ill.study_id = p_study_id
    AND ill.study_site_id = p_study_site_id;

  SELECT COALESCE(SUM(GREATEST(x.qty, 0)), 0)::BIGINT INTO v_transit
  FROM (
    SELECT
      e.lot_id,
      SUM(CASE WHEN e.entry_type = 'shipped_to_site' THEN e.quantity_delta ELSE 0 END)
        - SUM(CASE WHEN e.entry_type = 'received_at_site' THEN e.quantity_delta ELSE 0 END) AS qty
    FROM public.ip_ledger_entries e
    WHERE e.study_id = p_study_id
      AND e.to_study_site_id = p_study_site_id
    GROUP BY e.lot_id
  ) x
  JOIN public.ip_lots l ON l.id = x.lot_id
  WHERE l.item_id = p_item_id
    AND x.qty > 0;

  IF COALESCE(v_loc_qty, 0) > 0 OR COALESCE(v_transit, 0) > 0 THEN
    RAISE EXCEPTION 'Cannot remove site link while quantity remains on hand or in transit at this site. Adjust inventory first.';
  END IF;

  UPDATE public.ip_item_site_links
  SET deleted_at = NOW()
  WHERE study_id = p_study_id
    AND item_id = p_item_id
    AND study_site_id = p_study_site_id
    AND deleted_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.ip_restore_item_site_link(
  p_study_id UUID,
  p_item_id UUID,
  p_study_site_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ip_assert_study_company(p_study_id);

  UPDATE public.ip_item_site_links
  SET deleted_at = NULL
  WHERE study_id = p_study_id
    AND item_id = p_item_id
    AND study_site_id = p_study_site_id
    AND deleted_at IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Archived site link not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ip_archive_item_site_link(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ip_restore_item_site_link(UUID, UUID, UUID) TO authenticated;
