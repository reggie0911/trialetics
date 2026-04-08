-- Add optional expiry on lots created by ip_order_dispatch (Add order flow).

DROP FUNCTION IF EXISTS public.ip_order_dispatch(UUID, UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, UUID);

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

  PERFORM public.ip_internal_insert_ledger(
    p_study_id, p_source_lot_id, 'received_at_site', p_quantity,
    NULL, p_study_site_id, NULL, NULL, v_site_num, v_site_name, NULL, v_profile, '{}'::jsonb
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
  'Moves quantity from central pool into a new traced site lot; optional p_expiry_date stored on the new ip_lots row.';

GRANT EXECUTE ON FUNCTION public.ip_order_dispatch(UUID, UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, DATE, UUID) TO authenticated;
