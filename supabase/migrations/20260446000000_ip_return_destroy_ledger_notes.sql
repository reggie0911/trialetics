-- Optional operator comments on return-to-global and destroy-at-site ledger rows (metadata.notes).

DROP FUNCTION IF EXISTS public.ip_return_to_global(UUID, UUID, UUID, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.ip_return_to_global(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID,
  p_quantity INTEGER,
  p_container_fill_state TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile UUID;
  v_onhand INTEGER;
  v_updated INTEGER;
  v_meta JSONB := '{}'::jsonb;
  v_fill TEXT;
  v_note TEXT;
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

  v_fill := NULLIF(TRIM(BOTH FROM COALESCE(p_container_fill_state, '')), '');
  IF v_fill IS NOT NULL THEN
    IF v_fill NOT IN ('full', 'partial', 'empty') THEN
      RAISE EXCEPTION 'Invalid container_fill_state (use full, partial, or empty)';
    END IF;
    v_meta := jsonb_build_object('container_fill_state', v_fill);
  END IF;

  v_note := NULLIF(TRIM(BOTH FROM COALESCE(p_notes, '')), '');
  IF v_note IS NOT NULL THEN
    v_meta := v_meta || jsonb_build_object('notes', v_note);
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
    p_study_site_id, NULL, NULL, NULL, NULL, NULL, NULL, v_profile, v_meta
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ip_return_to_global(UUID, UUID, UUID, INTEGER, TEXT, TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.ip_destroy_at_site(UUID, UUID, UUID, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.ip_destroy_at_site(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID,
  p_quantity INTEGER,
  p_container_fill_state TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile UUID;
  v_onhand INTEGER;
  v_meta JSONB := '{}'::jsonb;
  v_fill TEXT;
  v_note TEXT;
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

  v_fill := NULLIF(TRIM(BOTH FROM COALESCE(p_container_fill_state, '')), '');
  IF v_fill IS NOT NULL THEN
    IF v_fill NOT IN ('full', 'partial', 'empty') THEN
      RAISE EXCEPTION 'Invalid container_fill_state (use full, partial, or empty)';
    END IF;
    v_meta := jsonb_build_object('container_fill_state', v_fill);
  END IF;

  v_note := NULLIF(TRIM(BOTH FROM COALESCE(p_notes, '')), '');
  IF v_note IS NOT NULL THEN
    v_meta := v_meta || jsonb_build_object('notes', v_note);
  END IF;

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
    p_study_site_id, NULL, NULL, NULL, NULL, NULL, NULL, v_profile, v_meta
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ip_destroy_at_site(UUID, UUID, UUID, INTEGER, TEXT, TEXT) TO authenticated;
