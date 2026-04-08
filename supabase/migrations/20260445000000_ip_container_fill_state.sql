-- Container fill state (full / partial / empty) on dispense, return, and destroy ledger metadata.
-- Expose on ip_v_log_rows for inventory logs UI.

DROP FUNCTION IF EXISTS public.ip_dispense(UUID, UUID, UUID, INTEGER, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.ip_dispense(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID,
  p_quantity INTEGER,
  p_subject_id UUID DEFAULT NULL,
  p_subject_number_free_text TEXT DEFAULT NULL,
  p_container_fill_state TEXT DEFAULT NULL
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
  v_meta JSONB;
  v_fill TEXT;
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

  IF p_subject_id IS NOT NULL THEN
    SELECT s.subject_number INTO v_subj_num
    FROM public.subjects s
    WHERE s.id = p_subject_id AND s.study_id = p_study_id;
    IF v_subj_num IS NULL THEN
      RAISE EXCEPTION 'Subject not in study';
    END IF;
    v_meta := '{}'::jsonb;
  ELSIF NULLIF(TRIM(BOTH FROM COALESCE(p_subject_number_free_text, '')), '') IS NOT NULL THEN
    v_subj_num := TRIM(BOTH FROM p_subject_number_free_text);
    v_meta := jsonb_build_object('subject_number_manual', v_subj_num);
  ELSE
    RAISE EXCEPTION 'Select a subject or enter a subject study number';
  END IF;

  v_fill := NULLIF(TRIM(BOTH FROM COALESCE(p_container_fill_state, '')), '');
  IF v_fill IS NOT NULL THEN
    IF v_fill NOT IN ('full', 'partial', 'empty') THEN
      RAISE EXCEPTION 'Invalid container_fill_state (use full, partial, or empty)';
    END IF;
    v_meta := COALESCE(v_meta, '{}'::jsonb) || jsonb_build_object('container_fill_state', v_fill);
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
    p_study_site_id, NULL, p_subject_id, v_subj_num, v_site_num, v_site_name, NULL, v_profile, COALESCE(v_meta, '{}'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ip_dispense(UUID, UUID, UUID, INTEGER, UUID, TEXT, TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.ip_return_to_global(UUID, UUID, UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.ip_return_to_global(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID,
  p_quantity INTEGER,
  p_container_fill_state TEXT DEFAULT NULL
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

GRANT EXECUTE ON FUNCTION public.ip_return_to_global(UUID, UUID, UUID, INTEGER, TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.ip_destroy_at_site(UUID, UUID, UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.ip_destroy_at_site(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID,
  p_quantity INTEGER,
  p_container_fill_state TEXT DEFAULT NULL
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

GRANT EXECUTE ON FUNCTION public.ip_destroy_at_site(UUID, UUID, UUID, INTEGER, TEXT) TO authenticated;

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
  recv_le.performed_at AS received_at,
  ill.notes,
  o.id AS order_id,
  o.deleted_at AS order_deleted_at,
  o.order_reference AS order_reference,
  o.status AS order_status,
  COALESCE(
    recv_p.display_name,
    NULLIF(TRIM(BOTH FROM COALESCE(recv_p.first_name, '') || ' ' || COALESCE(recv_p.last_name, '')), ''),
    recv_p.email
  ) AS received_by_name,
  COALESCE(
    disp_p.display_name,
    NULLIF(TRIM(BOTH FROM COALESCE(disp_p.first_name, '') || ' ' || COALESCE(disp_p.last_name, '')), ''),
    disp_p.email
  ) AS dispensed_by_name,
  COALESCE(
    ver_p.display_name,
    NULLIF(TRIM(BOTH FROM COALESCE(ver_p.first_name, '') || ' ' || COALESCE(ver_p.last_name, '')), ''),
    ver_p.email
  ) AS verified_by_name,
  l.expiry_date,
  disp_le.metadata->>'container_fill_state' AS dispensed_container_fill_state,
  ret_le.metadata->>'container_fill_state' AS returned_container_fill_state,
  dest_le.metadata->>'container_fill_state' AS destroyed_container_fill_state
FROM public.ip_lot_locations ill
JOIN public.ip_lots l ON l.id = ill.lot_id
JOIN public.ip_items i ON i.id = l.item_id
LEFT JOIN public.study_sites ss ON ss.id = ill.study_site_id
LEFT JOIN LATERAL (
  SELECT o.id, o.deleted_at, o.order_reference, o.status
  FROM public.ip_orders o
  WHERE o.study_id = i.study_id
    AND o.item_id = i.id
    AND o.study_site_id = ill.study_site_id
    AND o.lot_id = l.id
  ORDER BY (o.deleted_at IS NULL) DESC, o.created_at DESC NULLS LAST, o.id DESC
  LIMIT 1
) o ON TRUE
LEFT JOIN LATERAL (
  SELECT e.performed_at, e.subject_number_snapshot, e.performed_by_profile_id, e.metadata
  FROM public.ip_ledger_entries e
  WHERE e.lot_id = l.id
    AND e.from_study_site_id = ill.study_site_id
    AND e.entry_type = 'dispensed'
  ORDER BY e.performed_at DESC
  LIMIT 1
) disp_le ON TRUE
LEFT JOIN public.profiles disp_p ON disp_p.id = disp_le.performed_by_profile_id
LEFT JOIN LATERAL (
  SELECT e.performed_at, e.performed_by_profile_id
  FROM public.ip_ledger_entries e
  WHERE e.lot_id = l.id
    AND e.to_study_site_id = ill.study_site_id
    AND e.entry_type = 'received_at_site'
    AND e.quantity_delta > 0
    AND COALESCE(e.metadata->>'dispatch_mirror', '') <> 'true'
    AND COALESCE(e.metadata->>'system_fulfillment', '') <> 'true'
  ORDER BY e.performed_at DESC
  LIMIT 1
) recv_le ON TRUE
LEFT JOIN public.profiles recv_p ON recv_p.id = recv_le.performed_by_profile_id
LEFT JOIN public.profiles ver_p ON ver_p.id = ill.verified_by_profile_id
LEFT JOIN LATERAL (
  SELECT e.metadata
  FROM public.ip_ledger_entries e
  WHERE e.lot_id = l.id
    AND e.from_study_site_id = ill.study_site_id
    AND e.entry_type = 'returned_to_global'
  ORDER BY e.performed_at DESC
  LIMIT 1
) ret_le ON TRUE
LEFT JOIN LATERAL (
  SELECT e.metadata
  FROM public.ip_ledger_entries e
  WHERE e.lot_id = l.id
    AND e.from_study_site_id = ill.study_site_id
    AND e.entry_type = 'destroyed'
  ORDER BY e.performed_at DESC
  LIMIT 1
) dest_le ON TRUE
WHERE ill.study_site_id IS NOT NULL;

GRANT SELECT ON public.ip_v_log_rows TO authenticated;
