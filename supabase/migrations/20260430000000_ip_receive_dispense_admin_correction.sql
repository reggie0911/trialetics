-- Receive-at-site ledger metadata; dispense with optional free-text subject reference;
-- admin-only reconcile_adjustment to reset site line to available (Unused).

DROP FUNCTION IF EXISTS public.ip_receive_at_site(UUID, UUID, UUID, INTEGER);

-- ---------------------------------------------------------------------------
-- ip_receive_at_site: optional receipt timestamp + notes in ledger metadata
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ip_receive_at_site(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID,
  p_quantity INTEGER,
  p_received_at TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
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

  v_meta := jsonb_strip_nulls(
    jsonb_build_object(
      'received_at', p_received_at,
      'notes', NULLIF(TRIM(BOTH FROM COALESCE(p_notes, '')), '')
    )
  );
  IF v_meta IS NULL OR v_meta = 'null'::jsonb OR v_meta = '{}'::jsonb THEN
    v_meta := '{}'::jsonb;
  END IF;

  PERFORM public.ip_internal_insert_ledger(
    p_study_id, p_lot_id, 'received_at_site', p_quantity,
    NULL, p_study_site_id, NULL, NULL, v_site_num, v_site_name, NULL, v_profile, v_meta
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ip_receive_at_site(UUID, UUID, UUID, INTEGER, TIMESTAMPTZ, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- ip_dispense: optional free-text subject number when no subject_id (audit metadata)
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.ip_dispense(UUID, UUID, UUID, INTEGER, UUID);

CREATE OR REPLACE FUNCTION public.ip_dispense(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID,
  p_quantity INTEGER,
  p_subject_id UUID DEFAULT NULL,
  p_subject_number_free_text TEXT DEFAULT NULL
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

GRANT EXECUTE ON FUNCTION public.ip_dispense(UUID, UUID, UUID, INTEGER, UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- Admin: reset site line disposition to available (Unused) with audit row
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ip_admin_reset_site_line_to_available(
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
  v_old_disp TEXT;
  v_qoh INTEGER;
  v_qav INTEGER;
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
    RAISE EXCEPTION 'Only a company or platform administrator can reset disposition';
  END IF;

  PERFORM public.ip_assert_lot_item_not_archived(p_lot_id);

  SELECT ss.site_number, ss.name INTO v_site_num, v_site_name
  FROM public.study_sites ss
  WHERE ss.id = p_study_site_id AND ss.study_id = p_study_id;
  IF v_site_num IS NULL THEN
    RAISE EXCEPTION 'Site not in study';
  END IF;

  SELECT disposition, quantity_on_hand, quantity_available
  INTO v_old_disp, v_qoh, v_qav
  FROM public.ip_lot_locations
  WHERE lot_id = p_lot_id AND study_site_id = p_study_site_id AND study_id = p_study_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lot location not found at site';
  END IF;

  IF v_qoh IS NULL OR v_qoh <= 0 OR v_qav IS NULL OR v_qav <> v_qoh THEN
    RAISE EXCEPTION 'Disposition can only be reset when all on-hand quantity is available (no partial dispense)';
  END IF;

  IF v_old_disp = 'available' THEN
    RAISE EXCEPTION 'Line is already available';
  END IF;

  IF v_old_disp NOT IN ('used', 'returned', 'destroyed', 'transferred') THEN
    RAISE EXCEPTION 'This disposition cannot be reset via this action';
  END IF;

  UPDATE public.ip_lot_locations
  SET disposition = 'available',
      verified_at = NULL,
      verified_by_profile_id = NULL,
      updated_at = NOW()
  WHERE lot_id = p_lot_id AND study_site_id = p_study_site_id AND study_id = p_study_id;

  v_meta := jsonb_strip_nulls(
    jsonb_build_object(
      'previous_disposition', v_old_disp,
      'reason', NULLIF(TRIM(BOTH FROM COALESCE(p_reason, '')), '')
    )
  );

  PERFORM public.ip_internal_insert_ledger(
    p_study_id, p_lot_id, 'reconcile_adjustment', 0,
    p_study_site_id, NULL, NULL, NULL, v_site_num, v_site_name, NULL, v_profile, COALESCE(v_meta, '{}'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ip_admin_reset_site_line_to_available(UUID, UUID, UUID, TEXT) TO authenticated;
