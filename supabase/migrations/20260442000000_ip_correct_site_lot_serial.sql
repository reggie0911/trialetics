-- Allow setting or replacing ip_lots.serial_number for a site-scoped line when
-- quantity is in transit or on hand at that site. Append-only reconcile_adjustment for audit.

CREATE OR REPLACE FUNCTION public.ip_correct_site_lot_serial(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID,
  p_serial_number TEXT,
  p_reason TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile UUID;
  v_sn TEXT;
  v_item_id UUID;
  v_cur_serial TEXT;
  v_old_trim TEXT;
  v_in_transit INTEGER;
  v_onhand INTEGER;
  v_site_num TEXT;
  v_site_name TEXT;
  v_meta JSONB;
BEGIN
  PERFORM public.ip_assert_study_company(p_study_id);
  v_profile := public.ip_resolve_caller_profile_id();
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.study_sites ss
    WHERE ss.id = p_study_site_id AND ss.study_id = p_study_id
  ) THEN
    RAISE EXCEPTION 'Site not in study';
  END IF;

  SELECT l.item_id, l.serial_number
  INTO v_item_id, v_cur_serial
  FROM public.ip_lots l
  JOIN public.ip_items i ON i.id = l.item_id
  WHERE l.id = p_lot_id AND i.study_id = p_study_id
  FOR UPDATE;

  IF v_item_id IS NULL THEN
    RAISE EXCEPTION 'Lot not in study';
  END IF;

  PERFORM public.ip_assert_lot_item_not_archived(p_lot_id);

  SELECT
    COALESCE(SUM(CASE WHEN e.entry_type = 'shipped_to_site' AND e.to_study_site_id = p_study_site_id THEN e.quantity_delta ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN e.entry_type = 'received_at_site' AND e.to_study_site_id = p_study_site_id THEN e.quantity_delta ELSE 0 END), 0)
  INTO v_in_transit
  FROM public.ip_ledger_entries e
  WHERE e.study_id = p_study_id AND e.lot_id = p_lot_id;

  SELECT ill.quantity_on_hand INTO v_onhand
  FROM public.ip_lot_locations ill
  WHERE ill.lot_id = p_lot_id AND ill.study_id = p_study_id AND ill.study_site_id = p_study_site_id;

  IF (v_in_transit IS NULL OR v_in_transit <= 0) AND (v_onhand IS NULL OR v_onhand <= 0) THEN
    RAISE EXCEPTION 'Serial can only be set or corrected when this lot has quantity in transit or on hand at this site';
  END IF;

  v_sn := NULLIF(BTRIM(COALESCE(p_serial_number, '')), '');
  IF v_sn IS NULL THEN
    RAISE EXCEPTION 'Serial number is required';
  END IF;

  v_old_trim := BTRIM(COALESCE(v_cur_serial, ''));
  IF v_old_trim = v_sn THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.ip_lots l2
    WHERE l2.item_id = v_item_id AND l2.id <> p_lot_id
      AND COALESCE(l2.serial_number, '') = v_sn
  ) THEN
    RAISE EXCEPTION 'This serial number is already assigned to another lot for this catalog item';
  END IF;

  UPDATE public.ip_lots SET serial_number = v_sn, updated_at = NOW() WHERE id = p_lot_id;

  SELECT ss.site_number, ss.name INTO v_site_num, v_site_name
  FROM public.study_sites ss
  WHERE ss.id = p_study_site_id AND ss.study_id = p_study_id;

  v_meta := jsonb_strip_nulls(
    jsonb_build_object(
      'serial_correction', 'true',
      'previous_serial', NULLIF(v_old_trim, ''),
      'new_serial', v_sn,
      'reason', NULLIF(TRIM(BOTH FROM COALESCE(p_reason, '')), '')
    )
  );

  PERFORM public.ip_internal_insert_ledger(
    p_study_id, p_lot_id, 'reconcile_adjustment', 0,
    p_study_site_id, NULL, NULL, NULL, v_site_num, v_site_name, NULL, v_profile, COALESCE(v_meta, '{}'::jsonb)
  );

  PERFORM public.ip_ensure_site_lot_receipt_mirror_if_missing(p_study_id, p_lot_id, p_study_site_id);
END;
$$;

COMMENT ON FUNCTION public.ip_correct_site_lot_serial(UUID, UUID, UUID, TEXT, TEXT) IS
  'Sets or replaces ip_lots.serial_number when the lot has in-transit or on-hand quantity at the site; append-only reconcile_adjustment with metadata.serial_correction.';

GRANT EXECUTE ON FUNCTION public.ip_correct_site_lot_serial(UUID, UUID, UUID, TEXT, TEXT) TO authenticated;
