-- Received (site_shipments): per-site parity with study metrics + operator-only counting.
-- 1) Tag dispatch source-lot received_at_site with system_fulfillment.
-- 2) ip_receive_at_site: optional p_system_fulfillment for programmatic chain receive.
-- 3) shipments_received excludes dispatch_mirror and rows where metadata.system_fulfillment = 'true'.
-- 4) in_transit unchanged (all non-mirror received_at_site still reduce transit).

DROP FUNCTION IF EXISTS public.ip_order_dispatch(UUID, UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, DATE, UUID);

CREATE OR REPLACE FUNCTION public.ip_order_dispatch(
  p_study_id UUID,
  p_item_id UUID,
  p_source_lot_id UUID,
  p_study_site_id UUID,
  p_quantity INTEGER,
  p_lot_number TEXT DEFAULT NULL,
  p_serial_number TEXT DEFAULT NULL,
  p_batch_number TEXT DEFAULT NULL,
  p_expiry_date DATE DEFAULT NULL,
  p_inventory_trace_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile UUID;
  v_src_item UUID;
  v_global_q INTEGER;
  v_new_lot_id UUID;
  v_site_num TEXT;
  v_site_name TEXT;
  v_trace UUID;
  v_sn TEXT;
  v_ln TEXT;
  v_bn TEXT;
  v_mirror_meta JSONB;
  v_system_recv_meta JSONB;
BEGIN
  PERFORM public.ip_assert_study_company(p_study_id);
  v_profile := public.ip_resolve_caller_profile_id();
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.study_sites ss
    WHERE ss.id = p_study_site_id AND ss.study_id = p_study_id
  ) THEN
    RAISE EXCEPTION 'Site not in study';
  END IF;

  SELECT l.item_id INTO v_src_item
  FROM public.ip_lots l
  JOIN public.ip_items i ON i.id = l.item_id
  WHERE l.id = p_source_lot_id AND i.study_id = p_study_id;

  IF v_src_item IS NULL THEN
    RAISE EXCEPTION 'Source lot not in study';
  END IF;

  IF v_src_item <> p_item_id THEN
    RAISE EXCEPTION 'Source lot does not belong to this catalog item';
  END IF;

  PERFORM public.ip_assert_item_not_archived(p_item_id);
  PERFORM public.ip_assert_lot_item_not_archived(p_source_lot_id);

  SELECT ss.site_number, ss.name INTO v_site_num, v_site_name
  FROM public.study_sites ss
  WHERE ss.id = p_study_site_id AND ss.study_id = p_study_id;

  SELECT quantity_on_hand INTO v_global_q
  FROM public.ip_lot_locations
  WHERE lot_id = p_source_lot_id AND study_id = p_study_id AND study_site_id IS NULL;

  IF v_global_q IS NULL OR v_global_q < p_quantity THEN
    RAISE EXCEPTION 'Insufficient global quantity';
  END IF;

  v_trace := COALESCE(p_inventory_trace_id, gen_random_uuid());

  v_sn := NULLIF(BTRIM(COALESCE(p_serial_number, '')), '');
  v_ln := NULLIF(BTRIM(COALESCE(p_lot_number, '')), '');
  v_bn := NULLIF(BTRIM(COALESCE(p_batch_number, '')), '');

  INSERT INTO public.ip_lots (
    item_id, serial_number, lot_number, batch_number, expiry_date, inventory_trace_id
  ) VALUES (
    p_item_id, v_sn, v_ln, v_bn, p_expiry_date, v_trace
  )
  RETURNING id INTO v_new_lot_id;

  UPDATE public.ip_lot_locations
  SET quantity_on_hand = quantity_on_hand - p_quantity,
      quantity_available = GREATEST(0, quantity_available - p_quantity),
      updated_at = NOW()
  WHERE lot_id = p_source_lot_id AND study_id = p_study_id AND study_site_id IS NULL;

  INSERT INTO public.ip_lot_locations (
    lot_id, study_id, study_site_id, quantity_on_hand, quantity_available, disposition
  ) VALUES (
    v_new_lot_id, p_study_id, p_study_site_id, p_quantity, p_quantity, 'available'
  );

  PERFORM public.ip_internal_insert_ledger(
    p_study_id, p_source_lot_id, 'shipped_to_site', p_quantity,
    NULL, p_study_site_id, NULL, NULL, NULL, NULL, NULL, v_profile, '{}'::jsonb
  );

  v_system_recv_meta := jsonb_build_object('system_fulfillment', 'true');
  PERFORM public.ip_internal_insert_ledger(
    p_study_id, p_source_lot_id, 'received_at_site', p_quantity,
    NULL, p_study_site_id, NULL, NULL, v_site_num, v_site_name, NULL, v_profile, v_system_recv_meta
  );

  v_mirror_meta := jsonb_build_object('dispatch_mirror', TRUE);

  PERFORM public.ip_internal_insert_ledger(
    p_study_id, v_new_lot_id, 'shipped_to_site', p_quantity,
    NULL, p_study_site_id, NULL, NULL, NULL, NULL, NULL, v_profile, v_mirror_meta
  );

  PERFORM public.ip_internal_insert_ledger(
    p_study_id, v_new_lot_id, 'received_at_site', p_quantity,
    NULL, p_study_site_id, NULL, NULL, v_site_num, v_site_name, NULL, v_profile, v_mirror_meta
  );

  RETURN v_new_lot_id;
END;
$$;

COMMENT ON FUNCTION public.ip_order_dispatch(UUID, UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, DATE, UUID) IS
  'Moves quantity from central pool into a new traced site lot; source-lot received_at_site tagged system_fulfillment for metrics.';

GRANT EXECUTE ON FUNCTION public.ip_order_dispatch(UUID, UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, DATE, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- ip_receive_at_site: p_system_fulfillment tags programmatic receives
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.ip_receive_at_site(UUID, UUID, UUID, INTEGER, TIMESTAMPTZ, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.ip_receive_at_site(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID,
  p_quantity INTEGER,
  p_received_at TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_serial_number TEXT DEFAULT NULL,
  p_system_fulfillment BOOLEAN DEFAULT FALSE
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile UUID;
  v_site_num TEXT;
  v_site_name TEXT;
  v_in_transit INTEGER;
  v_updated INTEGER;
  v_meta JSONB;
  v_sn TEXT;
  v_item_id UUID;
  v_cur_serial TEXT;
BEGIN
  PERFORM public.ip_assert_study_company(p_study_id);
  v_profile := public.ip_resolve_caller_profile_id();
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.study_sites ss
    WHERE ss.id = p_study_site_id AND ss.study_id = p_study_id
  ) THEN
    RAISE EXCEPTION 'Site not in study';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.ip_lots l
    JOIN public.ip_items i ON i.id = l.item_id
    WHERE l.id = p_lot_id AND i.study_id = p_study_id
  ) THEN
    RAISE EXCEPTION 'Lot not in study';
  END IF;
  PERFORM public.ip_assert_lot_item_not_archived(p_lot_id);

  SELECT ss.site_number, ss.name INTO v_site_num, v_site_name
  FROM public.study_sites ss
  WHERE ss.id = p_study_site_id AND ss.study_id = p_study_id;

  SELECT
    COALESCE(SUM(CASE WHEN e.entry_type = 'shipped_to_site' AND e.to_study_site_id = p_study_site_id THEN e.quantity_delta ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN e.entry_type = 'received_at_site' AND e.to_study_site_id = p_study_site_id THEN e.quantity_delta ELSE 0 END), 0)
  INTO v_in_transit
  FROM public.ip_ledger_entries e
  WHERE e.study_id = p_study_id AND e.lot_id = p_lot_id;

  IF v_in_transit IS NULL OR v_in_transit < p_quantity THEN
    RAISE EXCEPTION 'Insufficient quantity sent to this site but not yet received for this lot';
  END IF;

  UPDATE public.ip_lot_locations
  SET quantity_on_hand = quantity_on_hand + p_quantity,
      quantity_available = quantity_available + p_quantity,
      disposition = 'available',
      updated_at = NOW()
  WHERE lot_id = p_lot_id AND study_site_id = p_study_site_id AND study_id = p_study_id;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    INSERT INTO public.ip_lot_locations (lot_id, study_id, study_site_id, quantity_on_hand, quantity_available, disposition)
    VALUES (p_lot_id, p_study_id, p_study_site_id, p_quantity, p_quantity, 'available');
  END IF;

  v_meta := jsonb_strip_nulls(
    jsonb_build_object(
      'received_at', p_received_at,
      'notes', NULLIF(TRIM(BOTH FROM COALESCE(p_notes, '')), ''),
      'system_fulfillment', CASE WHEN p_system_fulfillment THEN 'true' ELSE NULL END
    )
  );
  IF v_meta IS NULL OR v_meta = 'null'::jsonb OR v_meta = '{}'::jsonb THEN
    v_meta := '{}'::jsonb;
  END IF;

  PERFORM public.ip_internal_insert_ledger(
    p_study_id, p_lot_id, 'received_at_site', p_quantity,
    NULL, p_study_site_id, NULL, NULL, v_site_num, v_site_name, NULL, v_profile, v_meta
  );

  v_sn := NULLIF(BTRIM(COALESCE(p_serial_number, '')), '');
  IF v_sn IS NULL THEN
    RETURN;
  END IF;

  SELECT l.item_id, l.serial_number INTO v_item_id, v_cur_serial
  FROM public.ip_lots l
  WHERE l.id = p_lot_id
  FOR UPDATE;

  IF v_cur_serial IS NOT NULL AND BTRIM(v_cur_serial) <> '' THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.ip_lots l2
    WHERE l2.item_id = v_item_id AND l2.id <> p_lot_id
      AND COALESCE(l2.serial_number, '') = v_sn
  ) THEN
    RAISE EXCEPTION 'This serial number is already assigned to another lot for this catalog item';
  END IF;

  UPDATE public.ip_lots SET serial_number = v_sn WHERE id = p_lot_id;
END;
$$;

COMMENT ON FUNCTION public.ip_receive_at_site(UUID, UUID, UUID, INTEGER, TIMESTAMPTZ, TEXT, TEXT, BOOLEAN) IS
  'Receive in-transit quantity at site. Pass p_system_fulfillment true for automated ship→receive chains (excluded from operator Received metric).';

GRANT EXECUTE ON FUNCTION public.ip_receive_at_site(UUID, UUID, UUID, INTEGER, TIMESTAMPTZ, TEXT, TEXT, BOOLEAN) TO authenticated;

-- ---------------------------------------------------------------------------
-- ip_get_study_metrics: site_shipments = operator receipts only
-- ---------------------------------------------------------------------------

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
'IP inventory summary metrics. site_shipments counts operator received_at_site only (excludes dispatch_mirror and system_fulfillment). Compliance numerator nets verified minus verification_reversal reconcile rows.';

GRANT EXECUTE ON FUNCTION public.ip_get_study_metrics(UUID, UUID, TEXT, BOOLEAN) TO authenticated;

-- ---------------------------------------------------------------------------
-- ip_get_item_site_metrics: exclude dispatch mirrors; site_shipments = operator receipts
-- ---------------------------------------------------------------------------

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
'Per-site metrics for one catalog item. site_shipments counts operator receipts only; dispatch_mirror ledger rows excluded from rollups.';
