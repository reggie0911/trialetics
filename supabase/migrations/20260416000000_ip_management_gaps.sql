-- =====================================================
-- IP Management gap fixes:
-- 1. Extend ip_v_log_rows with latest dispense subject + timestamp
-- 2. Extend ip_v_log_rows with received_at timestamp
-- 3. Fix ip_return_to_global disposition when qty reaches 0
-- 4. Fix ip_transfer_site disposition when qty reaches 0
-- 5. Add ip_update_item and ip_delete_item RPCs
-- =====================================================

-- ---------------------------------------------------------------------------
-- 1 + 2. Replace ip_v_log_rows: add dispensed_at, dispensed_subject_number,
--         and received_at from ledger entries
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.ip_v_log_rows WITH (security_invoker = true) AS
SELECT
  ill.id AS location_id,
  i.study_id,
  ill.study_site_id,
  ss.site_number,
  ss.name AS site_name,
  i.id AS item_id,
  i.name AS item_name,
  i.category,
  i.unit,
  l.id AS lot_id,
  l.serial_number,
  l.lot_number,
  l.batch_number,
  ill.quantity_on_hand,
  ill.quantity_available,
  ill.disposition,
  ill.verified_at,
  ill.verified_by_profile_id,
  (ill.disposition = 'used' AND ill.verified_at IS NULL) AS flag_unverified_used,
  disp_le.performed_at AS dispensed_at,
  disp_le.subject_number_snapshot AS dispensed_subject_number,
  recv_le.performed_at AS received_at
FROM public.ip_lot_locations ill
JOIN public.ip_lots l ON l.id = ill.lot_id
JOIN public.ip_items i ON i.id = l.item_id
LEFT JOIN public.study_sites ss ON ss.id = ill.study_site_id
LEFT JOIN LATERAL (
  SELECT e.performed_at, e.subject_number_snapshot
  FROM public.ip_ledger_entries e
  WHERE e.lot_id = l.id
    AND e.from_study_site_id = ill.study_site_id
    AND e.entry_type = 'dispensed'
  ORDER BY e.performed_at DESC
  LIMIT 1
) disp_le ON true
LEFT JOIN LATERAL (
  SELECT e.performed_at
  FROM public.ip_ledger_entries e
  WHERE e.lot_id = l.id
    AND e.to_study_site_id = ill.study_site_id
    AND e.entry_type = 'received_at_site'
  ORDER BY e.performed_at DESC
  LIMIT 1
) recv_le ON true
WHERE ill.study_site_id IS NOT NULL;

GRANT SELECT ON public.ip_v_log_rows TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Fix ip_return_to_global: set disposition = 'returned' when qty hits 0
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 4. Fix ip_transfer_site: set disposition = 'transferred' when qty hits 0
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 5. Add ip_update_item RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ip_update_item(
  p_item_id UUID,
  p_name TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_unit TEXT DEFAULT NULL,
  p_part_or_material_number TEXT DEFAULT NULL
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

  UPDATE public.ip_items
  SET name = COALESCE(NULLIF(trim(p_name), ''), name),
      category = COALESCE(NULLIF(trim(p_category), ''), category),
      unit = COALESCE(NULLIF(trim(p_unit), ''), unit),
      part_or_material_number = CASE
        WHEN p_part_or_material_number IS NOT NULL THEN NULLIF(trim(p_part_or_material_number), '')
        ELSE part_or_material_number
      END
  WHERE id = p_item_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ip_update_item(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Add ip_delete_item RPC (only if no lots/ledger reference it)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ip_delete_item(
  p_item_id UUID
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

  IF EXISTS (SELECT 1 FROM public.ip_lots WHERE item_id = p_item_id LIMIT 1) THEN
    RAISE EXCEPTION 'Cannot delete item with existing lots. Remove all inventory first.';
  END IF;

  DELETE FROM public.ip_items WHERE id = p_item_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ip_delete_item(UUID) TO authenticated;
