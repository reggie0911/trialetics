-- Per-item compliance_pct: replaces the single study-wide compliance scalar
-- with per-item ratios so the UI can display compliance per catalog item row.

DROP FUNCTION IF EXISTS public.ip_get_study_metrics(UUID, UUID, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION public.ip_get_study_metrics(
  p_study_id UUID,
  p_study_site_id UUID DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_include_archived BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
  item_id UUID,
  item_name TEXT,
  category TEXT,
  unit TEXT,
  global_in_stock BIGINT,
  global_sent BIGINT,
  global_returns BIGINT,
  site_in_transit BIGINT,
  site_shipments BIGINT,
  site_returned BIGINT,
  site_used BIGINT,
  site_transfers BIGINT,
  site_destroyed BIGINT,
  site_onsite BIGINT,
  site_available BIGINT,
  associated_sites BIGINT,
  compliance_pct NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH items_f AS (
    SELECT i.id, i.name, i.category, i.unit
    FROM public.ip_items i
    WHERE i.study_id = p_study_id
      AND (p_category IS NULL OR p_category = '' OR i.category = p_category)
      AND (
        (COALESCE(p_include_archived, FALSE) AND i.deleted_at IS NOT NULL)
        OR (NOT COALESCE(p_include_archived, FALSE) AND i.deleted_at IS NULL)
      )
  ),
  global_stock AS (
    SELECT l.item_id, SUM(ill.quantity_on_hand)::BIGINT AS qty
    FROM public.ip_lot_locations ill
    JOIN public.ip_lots l ON l.id = ill.lot_id
    WHERE ill.study_id = p_study_id AND ill.study_site_id IS NULL
    GROUP BY l.item_id
  ),
  ledger_by_item AS (
    SELECT l.item_id, e.entry_type, SUM(e.quantity_delta)::BIGINT AS q
    FROM public.ip_ledger_entries e
    JOIN public.ip_lots l ON l.id = e.lot_id
    JOIN public.ip_items i ON i.id = l.item_id
    WHERE e.study_id = p_study_id
      AND (p_category IS NULL OR p_category = '' OR i.category = p_category)
      AND COALESCE(e.metadata->>'dispatch_mirror', '') <> 'true'
    GROUP BY l.item_id, e.entry_type
  ),
  site_loc AS (
    SELECT l.item_id,
           SUM(ill.quantity_on_hand)::BIGINT AS onsite,
           SUM(ill.quantity_available)::BIGINT AS avail
    FROM public.ip_lot_locations ill
    JOIN public.ip_lots l ON l.id = ill.lot_id
    JOIN public.ip_items i ON i.id = l.item_id
    WHERE ill.study_id = p_study_id
      AND ill.study_site_id IS NOT NULL
      AND (p_study_site_id IS NULL OR ill.study_site_id = p_study_site_id)
      AND (p_category IS NULL OR p_category = '' OR i.category = p_category)
    GROUP BY l.item_id
  ),
  site_ledger AS (
    SELECT l.item_id,
      (
        SUM(CASE WHEN e.entry_type = 'shipped_to_site' AND (p_study_site_id IS NULL OR e.to_study_site_id = p_study_site_id) THEN e.quantity_delta ELSE 0 END)
        - SUM(CASE WHEN e.entry_type = 'received_at_site' AND (p_study_site_id IS NULL OR e.to_study_site_id = p_study_site_id) THEN e.quantity_delta ELSE 0 END)
      )::BIGINT AS in_transit,
      SUM(CASE WHEN e.entry_type = 'received_at_site'
                    AND (p_study_site_id IS NULL OR e.to_study_site_id = p_study_site_id)
                    AND e.metadata->>'system_fulfillment' IS DISTINCT FROM 'true'
               THEN e.quantity_delta ELSE 0 END)::BIGINT AS shipments_received,
      SUM(CASE WHEN e.entry_type = 'returned_to_global' AND (p_study_site_id IS NULL OR e.from_study_site_id = p_study_site_id) THEN e.quantity_delta ELSE 0 END)::BIGINT AS returned,
      SUM(CASE WHEN e.entry_type = 'dispensed' AND (p_study_site_id IS NULL OR e.from_study_site_id = p_study_site_id) THEN -e.quantity_delta ELSE 0 END)::BIGINT AS used_amt,
      SUM(CASE WHEN e.entry_type IN ('transferred_out', 'transferred_in') AND (p_study_site_id IS NULL OR e.from_study_site_id = p_study_site_id OR e.to_study_site_id = p_study_site_id) THEN ABS(e.quantity_delta) ELSE 0 END)::BIGINT / 2 AS transfers,
      SUM(CASE WHEN e.entry_type = 'destroyed' AND (p_study_site_id IS NULL OR e.from_study_site_id = p_study_site_id) THEN -e.quantity_delta ELSE 0 END)::BIGINT AS destroyed_amt
    FROM public.ip_ledger_entries e
    JOIN public.ip_lots l ON l.id = e.lot_id
    JOIN public.ip_items i ON i.id = l.item_id
    WHERE e.study_id = p_study_id
      AND (p_category IS NULL OR p_category = '' OR i.category = p_category)
      AND COALESCE(e.metadata->>'dispatch_mirror', '') <> 'true'
    GROUP BY l.item_id
  ),
  link_counts AS (
    SELECT lnk.item_id, COUNT(*)::BIGINT AS n
    FROM public.ip_item_site_links lnk
    WHERE lnk.study_id = p_study_id
      AND lnk.deleted_at IS NULL
      AND (p_study_site_id IS NULL OR lnk.study_site_id = p_study_site_id)
    GROUP BY lnk.item_id
  ),
  per_item_compliance AS (
    SELECT
      l.item_id,
      GREATEST(0::NUMERIC,
        SUM(CASE WHEN e.entry_type = 'verified'
                      AND (p_study_site_id IS NULL OR e.from_study_site_id = p_study_site_id)
                 THEN 1 ELSE 0 END)::NUMERIC
        - SUM(CASE WHEN e.entry_type = 'reconcile_adjustment'
                        AND COALESCE(e.metadata->>'verification_reversal', '') = 'true'
                        AND (p_study_site_id IS NULL OR e.from_study_site_id = p_study_site_id)
                   THEN 1 ELSE 0 END)::NUMERIC
      ) AS verified_count,
      SUM(CASE WHEN e.entry_type = 'dispensed'
                    AND (p_study_site_id IS NULL OR e.from_study_site_id = p_study_site_id)
               THEN 1 ELSE 0 END)::NUMERIC AS dispensed_count
    FROM public.ip_ledger_entries e
    JOIN public.ip_lots l ON l.id = e.lot_id
    WHERE e.study_id = p_study_id
      AND COALESCE(e.metadata->>'dispatch_mirror', '') <> 'true'
    GROUP BY l.item_id
  )
  SELECT
    f.id,
    f.name,
    f.category,
    f.unit,
    COALESCE(gs.qty, 0)::BIGINT,
    COALESCE((SELECT q FROM ledger_by_item li WHERE li.item_id = f.id AND li.entry_type = 'shipped_to_site'), 0)::BIGINT,
    COALESCE((SELECT q FROM ledger_by_item li WHERE li.item_id = f.id AND li.entry_type = 'returned_to_global'), 0)::BIGINT,
    GREATEST(0, COALESCE(sl.in_transit, 0))::BIGINT,
    COALESCE(sl.shipments_received, 0)::BIGINT,
    COALESCE(sl.returned, 0)::BIGINT,
    COALESCE(sl.used_amt, 0)::BIGINT,
    COALESCE(sl.transfers, 0)::BIGINT,
    COALESCE(sl.destroyed_amt, 0)::BIGINT,
    COALESCE(sl2.onsite, 0)::BIGINT,
    COALESCE(sl2.avail, 0)::BIGINT,
    COALESCE(lc.n, 0)::BIGINT,
    CASE
      WHEN COALESCE(pic.dispensed_count, 0) = 0 THEN NULL
      ELSE 100.0 * pic.verified_count / pic.dispensed_count
    END
  FROM items_f f
  LEFT JOIN global_stock gs ON gs.item_id = f.id
  LEFT JOIN site_ledger sl ON sl.item_id = f.id
  LEFT JOIN site_loc sl2 ON sl2.item_id = f.id
  LEFT JOIN link_counts lc ON lc.item_id = f.id
  LEFT JOIN per_item_compliance pic ON pic.item_id = f.id;
$$;

COMMENT ON FUNCTION public.ip_get_study_metrics IS
'IP inventory summary metrics with per-item compliance_pct. Verified count nets verified minus verification_reversal reconcile rows; denominator is dispensed count.';

GRANT EXECUTE ON FUNCTION public.ip_get_study_metrics(UUID, UUID, TEXT, BOOLEAN) TO authenticated;
