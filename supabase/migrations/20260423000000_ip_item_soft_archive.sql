-- Soft archive / restore for catalog items (ip_items), study metrics modes, and inventory RPC guards.

-- ---------------------------------------------------------------------------
-- 1. Column
-- ---------------------------------------------------------------------------

ALTER TABLE public.ip_items
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.ip_items.deleted_at IS
  'When set, item is archived (hidden from default metrics). Inventory RPCs are blocked until restored.';

CREATE INDEX IF NOT EXISTS idx_ip_items_study_deleted
  ON public.ip_items (study_id)
  WHERE deleted_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ip_assert_item_not_archived(p_item_id UUID)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.ip_items i
    WHERE i.id = p_item_id AND i.deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'This equipment is archived. Restore it before recording inventory changes.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.ip_assert_lot_item_not_archived(p_lot_id UUID)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_item UUID;
BEGIN
  SELECT l.item_id INTO v_item FROM public.ip_lots l WHERE l.id = p_lot_id;
  IF v_item IS NULL THEN
    RETURN;
  END IF;
  PERFORM public.ip_assert_item_not_archived(v_item);
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Study metrics: fourth arg p_include_archived (default false)
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.ip_get_study_metrics(UUID, UUID, TEXT);

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
    GROUP BY l.item_id
  ),
  compliance AS (
    SELECT
      CASE WHEN p_study_site_id IS NULL THEN
        100.0 * (SELECT COUNT(*)::NUMERIC FROM public.ip_ledger_entries e2
                 JOIN public.ip_lots l2 ON l2.id = e2.lot_id
                 JOIN public.ip_items i2 ON i2.id = l2.item_id
                 WHERE e2.study_id = p_study_id AND e2.entry_type = 'verified'
                   AND (p_category IS NULL OR p_category = '' OR i2.category = p_category))
             / NULLIF((SELECT COUNT(*) FROM public.ip_ledger_entries e3
                 JOIN public.ip_lots l3 ON l3.id = e3.lot_id
                 JOIN public.ip_items i3 ON i3.id = l3.item_id
                 WHERE e3.study_id = p_study_id AND e3.entry_type = 'dispensed'
                   AND (p_category IS NULL OR p_category = '' OR i3.category = p_category)), 0)
      ELSE
        100.0 * (SELECT COUNT(*)::NUMERIC FROM public.ip_ledger_entries e2
                 JOIN public.ip_lots l2 ON l2.id = e2.lot_id
                 JOIN public.ip_items i2 ON i2.id = l2.item_id
                 WHERE e2.study_id = p_study_id AND e2.entry_type = 'verified'
                   AND e2.from_study_site_id = p_study_site_id
                   AND (p_category IS NULL OR p_category = '' OR i2.category = p_category))
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
    (SELECT pct FROM compliance LIMIT 1)
  FROM items_f f
  LEFT JOIN global_stock gs ON gs.item_id = f.id
  LEFT JOIN site_ledger sl ON sl.item_id = f.id
  LEFT JOIN site_loc sl2 ON sl2.item_id = f.id;
$$;

COMMENT ON FUNCTION public.ip_get_study_metrics IS
'IP inventory summary metrics. Pass p_include_archived true to list only archived catalog items; default false lists active items only.';

GRANT EXECUTE ON FUNCTION public.ip_get_study_metrics(UUID, UUID, TEXT, BOOLEAN) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Archive / restore catalog item
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ip_archive_item(p_item_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_study_id UUID;
  v_deleted TIMESTAMPTZ;
  v_loc_qty BIGINT;
  v_transit BIGINT;
BEGIN
  SELECT study_id, deleted_at INTO v_study_id, v_deleted
  FROM public.ip_items WHERE id = p_item_id;
  IF v_study_id IS NULL THEN
    RAISE EXCEPTION 'Item not found';
  END IF;
  IF v_deleted IS NOT NULL THEN
    RAISE EXCEPTION 'Item is already archived';
  END IF;
  PERFORM public.ip_assert_study_company(v_study_id);

  SELECT COALESCE(SUM(ill.quantity_on_hand), 0)::BIGINT INTO v_loc_qty
  FROM public.ip_lot_locations ill
  JOIN public.ip_lots l ON l.id = ill.lot_id
  WHERE l.item_id = p_item_id
    AND ill.study_id = v_study_id;

  SELECT COALESCE(SUM(GREATEST(x.qty, 0)), 0)::BIGINT INTO v_transit
  FROM (
    SELECT
      e.lot_id,
      e.to_study_site_id AS study_site_id,
      SUM(CASE WHEN e.entry_type = 'shipped_to_site' THEN e.quantity_delta ELSE 0 END)
        - SUM(CASE WHEN e.entry_type = 'received_at_site' THEN e.quantity_delta ELSE 0 END) AS qty
    FROM public.ip_ledger_entries e
    WHERE e.study_id = v_study_id
      AND e.to_study_site_id IS NOT NULL
    GROUP BY e.lot_id, e.to_study_site_id
  ) x
  JOIN public.ip_lots l ON l.id = x.lot_id
  WHERE l.item_id = p_item_id
    AND x.qty > 0;

  IF COALESCE(v_loc_qty, 0) > 0 OR COALESCE(v_transit, 0) > 0 THEN
    RAISE EXCEPTION 'Cannot archive while quantity remains on hand or in transit. Adjust inventory first.';
  END IF;

  UPDATE public.ip_items SET deleted_at = NOW() WHERE id = p_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ip_restore_item(p_item_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_study_id UUID;
BEGIN
  SELECT study_id INTO v_study_id FROM public.ip_items WHERE id = p_item_id;
  IF v_study_id IS NULL THEN
    RAISE EXCEPTION 'Item not found';
  END IF;
  PERFORM public.ip_assert_study_company(v_study_id);

  UPDATE public.ip_items SET deleted_at = NULL WHERE id = p_item_id AND deleted_at IS NOT NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item is not archived';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ip_archive_item(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ip_restore_item(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.ip_delete_item(UUID);

-- ---------------------------------------------------------------------------
-- 5. ip_update_item: metadata merge + block edits when archived
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.ip_update_item(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.ip_update_item(
  p_item_id UUID,
  p_name TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_unit TEXT DEFAULT NULL,
  p_part_or_material_number TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_study_id UUID;
BEGIN
  SELECT study_id INTO v_study_id FROM public.ip_items WHERE id = p_item_id;
  IF v_study_id IS NULL THEN
    RAISE EXCEPTION 'Item not found';
  END IF;
  PERFORM public.ip_assert_study_company(v_study_id);

  IF EXISTS (SELECT 1 FROM public.ip_items i WHERE i.id = p_item_id AND i.deleted_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Cannot edit archived equipment. Restore it first.';
  END IF;

  UPDATE public.ip_items
  SET name = COALESCE(NULLIF(trim(p_name), ''), name),
      category = COALESCE(NULLIF(trim(p_category), ''), category),
      unit = COALESCE(NULLIF(trim(p_unit), ''), unit),
      part_or_material_number = CASE
        WHEN p_part_or_material_number IS NOT NULL THEN NULLIF(trim(p_part_or_material_number), '')
        ELSE part_or_material_number
      END,
      metadata = CASE
        WHEN p_metadata IS NOT NULL THEN COALESCE(metadata, '{}'::jsonb) || p_metadata
        ELSE metadata
      END
  WHERE id = p_item_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ip_update_item(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. ip_initial_global_receipt: block archived items
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ip_initial_global_receipt(
  p_study_id UUID,
  p_item_id UUID,
  p_quantity INTEGER,
  p_lot_number TEXT DEFAULT NULL,
  p_serial_number TEXT DEFAULT NULL,
  p_batch_number TEXT DEFAULT NULL,
  p_expiry_date DATE DEFAULT NULL,
  p_receipt_metadata JSONB DEFAULT '{}'::JSONB,
  p_inventory_trace_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile UUID;
  v_lot_id UUID;
  v_updated INTEGER;
BEGIN
  PERFORM public.ip_assert_study_company(p_study_id);
  v_profile := public.ip_resolve_caller_profile_id();
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ip_items i WHERE i.id = p_item_id AND i.study_id = p_study_id) THEN
    RAISE EXCEPTION 'Item not in study';
  END IF;
  PERFORM public.ip_assert_item_not_archived(p_item_id);

  IF p_inventory_trace_id IS NOT NULL THEN
    INSERT INTO public.ip_lots (
      item_id, serial_number, lot_number, batch_number, expiry_date, inventory_trace_id
    )
    VALUES (
      p_item_id, p_serial_number, p_lot_number, p_batch_number, p_expiry_date, p_inventory_trace_id
    )
    RETURNING id INTO v_lot_id;
  ELSE
    SELECT l.id INTO v_lot_id
    FROM public.ip_lots l
    WHERE l.item_id = p_item_id
      AND l.inventory_trace_id IS NULL
      AND COALESCE(l.serial_number, '') = COALESCE(p_serial_number, '')
      AND COALESCE(l.lot_number, '') = COALESCE(p_lot_number, '')
      AND COALESCE(l.batch_number, '') = COALESCE(p_batch_number, '');

    IF v_lot_id IS NULL THEN
      INSERT INTO public.ip_lots (
        item_id, serial_number, lot_number, batch_number, expiry_date, inventory_trace_id
      )
      VALUES (
        p_item_id, p_serial_number, p_lot_number, p_batch_number, p_expiry_date, NULL
      )
      RETURNING id INTO v_lot_id;
    END IF;
  END IF;

  UPDATE public.ip_lot_locations
  SET quantity_on_hand = quantity_on_hand + p_quantity,
      quantity_available = quantity_available + p_quantity,
      disposition = 'available',
      updated_at = NOW()
  WHERE lot_id = v_lot_id AND study_site_id IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    INSERT INTO public.ip_lot_locations (lot_id, study_id, study_site_id, quantity_on_hand, quantity_available, disposition)
    VALUES (v_lot_id, p_study_id, NULL, p_quantity, p_quantity, 'available');
  END IF;

  PERFORM public.ip_internal_insert_ledger(
    p_study_id, v_lot_id, 'initial_global_receipt', p_quantity,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, v_profile, COALESCE(p_receipt_metadata, '{}'::JSONB)
  );

  RETURN v_lot_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Lot-scoped RPCs: block when catalog item is archived
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ip_ship_to_site(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID,
  p_quantity INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile UUID;
  v_global_q INTEGER;
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

  SELECT quantity_on_hand INTO v_global_q
  FROM public.ip_lot_locations
  WHERE lot_id = p_lot_id AND study_site_id IS NULL;
  IF v_global_q IS NULL OR v_global_q < p_quantity THEN
    RAISE EXCEPTION 'Insufficient global quantity';
  END IF;

  UPDATE public.ip_lot_locations
  SET quantity_on_hand = quantity_on_hand - p_quantity,
      quantity_available = GREATEST(0, quantity_available - p_quantity),
      updated_at = NOW()
  WHERE lot_id = p_lot_id AND study_site_id IS NULL;

  PERFORM public.ip_internal_insert_ledger(
    p_study_id, p_lot_id, 'shipped_to_site', p_quantity,
    NULL, p_study_site_id, NULL, NULL, NULL, NULL, NULL, v_profile, '{}'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.ip_receive_at_site(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID,
  p_quantity INTEGER
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
    RAISE EXCEPTION 'Insufficient in-transit quantity for this lot and site';
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

  PERFORM public.ip_internal_insert_ledger(
    p_study_id, p_lot_id, 'received_at_site', p_quantity,
    NULL, p_study_site_id, NULL, NULL, v_site_num, v_site_name, NULL, v_profile, '{}'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.ip_dispense(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID,
  p_quantity INTEGER,
  p_subject_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile UUID;
  v_subj_num TEXT;
  v_site_num TEXT;
  v_site_name TEXT;
  v_avail INTEGER;
BEGIN
  PERFORM public.ip_assert_study_company(p_study_id);
  v_profile := public.ip_resolve_caller_profile_id();
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;
  PERFORM public.ip_assert_lot_item_not_archived(p_lot_id);
  SELECT s.subject_number INTO v_subj_num
  FROM public.subjects s
  WHERE s.id = p_subject_id AND s.study_id = p_study_id;
  IF v_subj_num IS NULL THEN
    RAISE EXCEPTION 'Subject not in study';
  END IF;
  SELECT ss.site_number, ss.name INTO v_site_num, v_site_name
  FROM public.study_sites ss
  WHERE ss.id = p_study_site_id AND ss.study_id = p_study_id;

  SELECT quantity_available INTO v_avail
  FROM public.ip_lot_locations
  WHERE lot_id = p_lot_id AND study_site_id = p_study_site_id;
  IF v_avail IS NULL OR v_avail < p_quantity THEN
    RAISE EXCEPTION 'Insufficient available quantity at site';
  END IF;

  UPDATE public.ip_lot_locations
  SET quantity_on_hand = quantity_on_hand - p_quantity,
      quantity_available = quantity_available - p_quantity,
      disposition = CASE WHEN quantity_on_hand - p_quantity <= 0 THEN 'used' ELSE disposition END,
      updated_at = NOW()
  WHERE lot_id = p_lot_id AND study_site_id = p_study_site_id;

  PERFORM public.ip_internal_insert_ledger(
    p_study_id, p_lot_id, 'dispensed', -p_quantity,
    p_study_site_id, NULL, p_subject_id, v_subj_num, v_site_num, v_site_name, NULL, v_profile, '{}'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.ip_verify_lot(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile UUID;
  v_site_num TEXT;
  v_site_name TEXT;
BEGIN
  PERFORM public.ip_assert_study_company(p_study_id);
  v_profile := public.ip_resolve_caller_profile_id();
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  PERFORM public.ip_assert_lot_item_not_archived(p_lot_id);
  SELECT ss.site_number, ss.name INTO v_site_num, v_site_name
  FROM public.study_sites ss
  WHERE ss.id = p_study_site_id AND ss.study_id = p_study_id;
  IF v_site_num IS NULL THEN
    RAISE EXCEPTION 'Site not in study';
  END IF;

  UPDATE public.ip_lot_locations
  SET verified_at = NOW(),
      verified_by_profile_id = v_profile,
      updated_at = NOW()
  WHERE lot_id = p_lot_id AND study_site_id = p_study_site_id AND study_id = p_study_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lot location not found at site';
  END IF;

  PERFORM public.ip_internal_insert_ledger(
    p_study_id, p_lot_id, 'verified', 0,
    p_study_site_id, NULL, NULL, NULL, v_site_num, v_site_name, NULL, v_profile, '{}'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.ip_return_to_global(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID,
  p_quantity INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile UUID;
  v_onhand INTEGER;
  v_updated INTEGER;
BEGIN
  PERFORM public.ip_assert_study_company(p_study_id);
  v_profile := public.ip_resolve_caller_profile_id();
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;
  PERFORM public.ip_assert_lot_item_not_archived(p_lot_id);

  SELECT quantity_on_hand INTO v_onhand
  FROM public.ip_lot_locations
  WHERE lot_id = p_lot_id AND study_site_id = p_study_site_id;
  IF v_onhand IS NULL OR v_onhand < p_quantity THEN
    RAISE EXCEPTION 'Insufficient quantity at site';
  END IF;

  UPDATE public.ip_lot_locations
  SET quantity_on_hand = quantity_on_hand - p_quantity,
      quantity_available = LEAST(quantity_available, quantity_on_hand - p_quantity),
      disposition = CASE WHEN quantity_on_hand - p_quantity <= 0 THEN 'returned' ELSE disposition END,
      updated_at = NOW()
  WHERE lot_id = p_lot_id AND study_site_id = p_study_site_id;

  UPDATE public.ip_lot_locations
  SET quantity_on_hand = quantity_on_hand + p_quantity,
      quantity_available = quantity_available + p_quantity,
      disposition = 'available',
      updated_at = NOW()
  WHERE lot_id = p_lot_id AND study_site_id IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    INSERT INTO public.ip_lot_locations (lot_id, study_id, study_site_id, quantity_on_hand, quantity_available, disposition)
    VALUES (p_lot_id, p_study_id, NULL, p_quantity, p_quantity, 'available');
  END IF;

  PERFORM public.ip_internal_insert_ledger(
    p_study_id, p_lot_id, 'returned_to_global', p_quantity,
    p_study_site_id, NULL, NULL, NULL, NULL, NULL, NULL, v_profile, '{}'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.ip_transfer_site(
  p_study_id UUID,
  p_lot_id UUID,
  p_from_site_id UUID,
  p_to_site_id UUID,
  p_quantity INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile UUID;
  v_onhand INTEGER;
  v_updated INTEGER;
BEGIN
  PERFORM public.ip_assert_study_company(p_study_id);
  v_profile := public.ip_resolve_caller_profile_id();
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_from_site_id = p_to_site_id THEN
    RAISE EXCEPTION 'From and to site must differ';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;
  PERFORM public.ip_assert_lot_item_not_archived(p_lot_id);

  SELECT quantity_on_hand INTO v_onhand
  FROM public.ip_lot_locations
  WHERE lot_id = p_lot_id AND study_site_id = p_from_site_id;
  IF v_onhand IS NULL OR v_onhand < p_quantity THEN
    RAISE EXCEPTION 'Insufficient quantity at source site';
  END IF;

  UPDATE public.ip_lot_locations
  SET quantity_on_hand = quantity_on_hand - p_quantity,
      quantity_available = LEAST(quantity_available, quantity_on_hand - p_quantity),
      disposition = CASE WHEN quantity_on_hand - p_quantity <= 0 THEN 'transferred' ELSE disposition END,
      updated_at = NOW()
  WHERE lot_id = p_lot_id AND study_site_id = p_from_site_id;

  UPDATE public.ip_lot_locations
  SET quantity_on_hand = quantity_on_hand + p_quantity,
      quantity_available = quantity_available + p_quantity,
      disposition = 'available',
      updated_at = NOW()
  WHERE lot_id = p_lot_id AND study_site_id = p_to_site_id;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    INSERT INTO public.ip_lot_locations (lot_id, study_id, study_site_id, quantity_on_hand, quantity_available, disposition)
    VALUES (p_lot_id, p_study_id, p_to_site_id, p_quantity, p_quantity, 'available');
  END IF;

  PERFORM public.ip_internal_insert_ledger(
    p_study_id, p_lot_id, 'transferred_out', -p_quantity,
    p_from_site_id, p_to_site_id, NULL, NULL, NULL, NULL, NULL, v_profile, '{}'::jsonb
  );
  PERFORM public.ip_internal_insert_ledger(
    p_study_id, p_lot_id, 'transferred_in', p_quantity,
    p_from_site_id, p_to_site_id, NULL, NULL, NULL, NULL, NULL, v_profile, '{}'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.ip_destroy_at_site(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID,
  p_quantity INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile UUID;
  v_onhand INTEGER;
BEGIN
  PERFORM public.ip_assert_study_company(p_study_id);
  v_profile := public.ip_resolve_caller_profile_id();
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;
  PERFORM public.ip_assert_lot_item_not_archived(p_lot_id);

  SELECT quantity_on_hand INTO v_onhand
  FROM public.ip_lot_locations
  WHERE lot_id = p_lot_id AND study_site_id = p_study_site_id;
  IF v_onhand IS NULL OR v_onhand < p_quantity THEN
    RAISE EXCEPTION 'Insufficient quantity at site';
  END IF;

  UPDATE public.ip_lot_locations
  SET quantity_on_hand = quantity_on_hand - p_quantity,
      quantity_available = LEAST(quantity_available, GREATEST(0, quantity_on_hand - p_quantity)),
      disposition = CASE WHEN quantity_on_hand - p_quantity <= 0 THEN 'destroyed' ELSE disposition END,
      updated_at = NOW()
  WHERE lot_id = p_lot_id AND study_site_id = p_study_site_id;

  PERFORM public.ip_internal_insert_ledger(
    p_study_id, p_lot_id, 'destroyed', -p_quantity,
    p_study_site_id, NULL, NULL, NULL, NULL, NULL, NULL, v_profile, '{}'::jsonb
  );
END;
$$;
