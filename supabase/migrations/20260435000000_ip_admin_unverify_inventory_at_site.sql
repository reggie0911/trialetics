-- Admin-only: clear mistaken site-line verification (inverse of ip_verify_lot).
-- Appends reconcile_adjustment with metadata.verification_reversal=true for audit and compliance netting.

CREATE OR REPLACE FUNCTION public.ip_admin_unverify_inventory_at_site(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile UUID;
  v_site_num TEXT;
  v_site_name TEXT;
  v_study_company UUID;
  v_prof_company UUID;
  v_role TEXT;
  v_platform_admin BOOLEAN;
  v_disp TEXT;
  v_ver_at TIMESTAMPTZ;
  v_meta JSONB;
BEGIN
  PERFORM public.ip_assert_study_company(p_study_id);
  v_profile := public.ip_resolve_caller_profile_id();
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT company_id INTO v_study_company FROM public.studies WHERE id = p_study_id;
  SELECT company_id, role, COALESCE(is_platform_admin, false)
  INTO v_prof_company, v_role, v_platform_admin
  FROM public.profiles
  WHERE id = v_profile;

  IF v_prof_company IS NULL OR v_prof_company <> v_study_company THEN
    RAISE EXCEPTION 'Not authorized for this study';
  END IF;
  IF v_role IS DISTINCT FROM 'admin' AND NOT v_platform_admin THEN
    RAISE EXCEPTION 'Only a company or platform administrator can remove verification';
  END IF;

  PERFORM public.ip_assert_lot_item_not_archived(p_lot_id);

  SELECT ss.site_number, ss.name INTO v_site_num, v_site_name
  FROM public.study_sites ss
  WHERE ss.id = p_study_site_id AND ss.study_id = p_study_id;
  IF v_site_num IS NULL THEN
    RAISE EXCEPTION 'Site not in study';
  END IF;

  SELECT disposition, verified_at
  INTO v_disp, v_ver_at
  FROM public.ip_lot_locations
  WHERE lot_id = p_lot_id AND study_site_id = p_study_site_id AND study_id = p_study_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lot location not found at site';
  END IF;

  IF v_disp IS DISTINCT FROM 'used' THEN
    RAISE EXCEPTION 'Verification can only be removed for lines in Used disposition';
  END IF;

  IF v_ver_at IS NULL THEN
    RAISE EXCEPTION 'This line is not verified';
  END IF;

  UPDATE public.ip_lot_locations
  SET verified_at = NULL,
      verified_by_profile_id = NULL,
      updated_at = NOW()
  WHERE lot_id = p_lot_id AND study_site_id = p_study_site_id AND study_id = p_study_id;

  v_meta := jsonb_strip_nulls(
    jsonb_build_object(
      'verification_reversal', 'true',
      'reason', NULLIF(TRIM(BOTH FROM COALESCE(p_reason, '')), '')
    )
  );

  PERFORM public.ip_internal_insert_ledger(
    p_study_id, p_lot_id, 'reconcile_adjustment', 0,
    p_study_site_id, NULL, NULL, NULL, v_site_num, v_site_name, NULL, v_profile, COALESCE(v_meta, '{}'::jsonb)
  );
END;
$$;

COMMENT ON FUNCTION public.ip_admin_unverify_inventory_at_site(UUID, UUID, UUID, TEXT) IS
  'Admin-only: clear ip_lot_locations verification for a Used site line; append-only reconcile_adjustment with metadata.verification_reversal=true. Compliance metrics net count(verified) minus count of such reversal rows; intended one reversal per mistaken verify.';

GRANT EXECUTE ON FUNCTION public.ip_admin_unverify_inventory_at_site(UUID, UUID, UUID, TEXT) TO authenticated;

-- Compliance: subtract verification-reversal reconcile rows from verified count (same filters as numerator).
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
      SUM(CASE WHEN e.entry_type = 'received_at_site' AND (p_study_site_id IS NULL OR e.to_study_site_id = p_study_site_id) THEN e.quantity_delta ELSE 0 END)::BIGINT AS shipments_received,
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
  compliance AS (
    SELECT
      CASE WHEN p_study_site_id IS NULL THEN
        100.0 * GREATEST(0::NUMERIC,
          (SELECT COUNT(*)::NUMERIC FROM public.ip_ledger_entries e2
           JOIN public.ip_lots l2 ON l2.id = e2.lot_id
           JOIN public.ip_items i2 ON i2.id = l2.item_id
           WHERE e2.study_id = p_study_id AND e2.entry_type = 'verified'
             AND (p_category IS NULL OR p_category = '' OR i2.category = p_category))
          - (SELECT COUNT(*)::NUMERIC FROM public.ip_ledger_entries er
           JOIN public.ip_lots lr ON lr.id = er.lot_id
           JOIN public.ip_items ir ON ir.id = lr.item_id
           WHERE er.study_id = p_study_id
             AND er.entry_type = 'reconcile_adjustment'
             AND COALESCE(er.metadata->>'verification_reversal', '') = 'true'
             AND (p_category IS NULL OR p_category = '' OR ir.category = p_category)))
        / NULLIF((SELECT COUNT(*) FROM public.ip_ledger_entries e3
           JOIN public.ip_lots l3 ON l3.id = e3.lot_id
           JOIN public.ip_items i3 ON i3.id = l3.item_id
           WHERE e3.study_id = p_study_id AND e3.entry_type = 'dispensed'
             AND (p_category IS NULL OR p_category = '' OR i3.category = p_category)), 0)
      ELSE
        100.0 * GREATEST(0::NUMERIC,
          (SELECT COUNT(*)::NUMERIC FROM public.ip_ledger_entries e2
           JOIN public.ip_lots l2 ON l2.id = e2.lot_id
           JOIN public.ip_items i2 ON i2.id = l2.item_id
           WHERE e2.study_id = p_study_id AND e2.entry_type = 'verified'
             AND e2.from_study_site_id = p_study_site_id
             AND (p_category IS NULL OR p_category = '' OR i2.category = p_category))
          - (SELECT COUNT(*)::NUMERIC FROM public.ip_ledger_entries er
           JOIN public.ip_lots lr ON lr.id = er.lot_id
           JOIN public.ip_items ir ON ir.id = lr.item_id
           WHERE er.study_id = p_study_id
             AND er.entry_type = 'reconcile_adjustment'
             AND COALESCE(er.metadata->>'verification_reversal', '') = 'true'
             AND er.from_study_site_id = p_study_site_id
             AND (p_category IS NULL OR p_category = '' OR ir.category = p_category)))
        / NULLIF((SELECT COUNT(*) FROM public.ip_ledger_entries e3
           JOIN public.ip_lots l3 ON l3.id = e3.lot_id
           JOIN public.ip_items i3 ON i3.id = l3.item_id
           WHERE e3.study_id = p_study_id AND e3.entry_type = 'dispensed'
             AND e3.from_study_site_id = p_study_site_id
             AND (p_category IS NULL OR p_category = '' OR i3.category = p_category)), 0)
      END AS pct
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
    (SELECT pct FROM compliance LIMIT 1)
  FROM items_f f
  LEFT JOIN global_stock gs ON gs.item_id = f.id
  LEFT JOIN site_ledger sl ON sl.item_id = f.id
  LEFT JOIN site_loc sl2 ON sl2.item_id = f.id
  LEFT JOIN link_counts lc ON lc.item_id = f.id;
$$;

COMMENT ON FUNCTION public.ip_get_study_metrics IS
'IP inventory summary metrics. Pass p_include_archived true to list only archived catalog items; default false lists active items only. Ledger rows with metadata.dispatch_mirror=true (dispatch site-lot mirrors) are excluded from item-level shipped/received rollups. Compliance numerator nets verified entries minus reconcile_adjustment rows with metadata.verification_reversal=true.';

GRANT EXECUTE ON FUNCTION public.ip_get_study_metrics(UUID, UUID, TEXT, BOOLEAN) TO authenticated;
