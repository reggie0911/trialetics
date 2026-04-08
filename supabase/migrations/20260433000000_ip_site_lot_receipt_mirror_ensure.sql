-- Site lots that only got stock via legacy dispatch (or serial saved before mirror ledger existed) can lack
-- received_at_site rows on the child lot, so ip_v_log_rows leaves Received by / Date empty.
-- Idempotent: insert paired shipped_to_site + received_at_site with dispatch_mirror (metrics already exclude those).

CREATE OR REPLACE FUNCTION public.ip_ensure_site_lot_receipt_mirror_if_missing(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile UUID;
  v_onhand INTEGER;
  v_mirror_meta JSONB;
  v_site_num TEXT;
  v_site_name TEXT;
BEGIN
  PERFORM public.ip_assert_study_company(p_study_id);
  v_profile := public.ip_resolve_caller_profile_id();
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.ip_lots l
    JOIN public.ip_items i ON i.id = l.item_id
    WHERE l.id = p_lot_id AND i.study_id = p_study_id
  ) THEN
    RAISE EXCEPTION 'Lot not in study';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.study_sites ss
    WHERE ss.id = p_study_site_id AND ss.study_id = p_study_id
  ) THEN
    RAISE EXCEPTION 'Site not in study';
  END IF;

  PERFORM public.ip_assert_lot_item_not_archived(p_lot_id);

  IF EXISTS (
    SELECT 1 FROM public.ip_ledger_entries e
    WHERE e.lot_id = p_lot_id
      AND e.to_study_site_id = p_study_site_id
      AND e.entry_type = 'received_at_site'
  ) THEN
    RETURN FALSE;
  END IF;

  SELECT ill.quantity_on_hand INTO v_onhand
  FROM public.ip_lot_locations ill
  WHERE ill.lot_id = p_lot_id AND ill.study_id = p_study_id AND ill.study_site_id = p_study_site_id;

  IF v_onhand IS NULL OR v_onhand <= 0 THEN
    RETURN FALSE;
  END IF;

  SELECT ss.site_number, ss.name INTO v_site_num, v_site_name
  FROM public.study_sites ss
  WHERE ss.id = p_study_site_id AND ss.study_id = p_study_id;

  v_mirror_meta := jsonb_build_object('dispatch_mirror', TRUE);

  PERFORM public.ip_internal_insert_ledger(
    p_study_id, p_lot_id, 'shipped_to_site', v_onhand,
    NULL, p_study_site_id, NULL, NULL, NULL, NULL, NULL, v_profile, v_mirror_meta
  );
  PERFORM public.ip_internal_insert_ledger(
    p_study_id, p_lot_id, 'received_at_site', v_onhand,
    NULL, p_study_site_id, NULL, NULL, v_site_num, v_site_name, NULL, v_profile, v_mirror_meta
  );

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.ip_ensure_site_lot_receipt_mirror_if_missing(UUID, UUID, UUID) IS
  'If a site lot line has on-hand quantity but no received_at_site ledger row for that site, inserts paired shipped/received rows with dispatch_mirror so logs and ip_v_log_rows show receipt metadata.';

GRANT EXECUTE ON FUNCTION public.ip_ensure_site_lot_receipt_mirror_if_missing(UUID, UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.ip_set_site_lot_serial(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID,
  p_serial_number TEXT
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
  v_onhand INTEGER;
BEGIN
  PERFORM public.ip_assert_study_company(p_study_id);
  v_profile := public.ip_resolve_caller_profile_id();
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_sn := NULLIF(BTRIM(COALESCE(p_serial_number, '')), '');
  IF v_sn IS NULL THEN
    RAISE EXCEPTION 'Serial number is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.study_sites ss
    WHERE ss.id = p_study_site_id AND ss.study_id = p_study_id
  ) THEN
    RAISE EXCEPTION 'Site not in study';
  END IF;

  SELECT l.item_id, l.serial_number INTO v_item_id, v_cur_serial
  FROM public.ip_lots l
  JOIN public.ip_items i ON i.id = l.item_id
  WHERE l.id = p_lot_id AND i.study_id = p_study_id
  FOR UPDATE;

  IF v_item_id IS NULL THEN
    RAISE EXCEPTION 'Lot not in study';
  END IF;

  PERFORM public.ip_assert_lot_item_not_archived(p_lot_id);

  SELECT ill.quantity_on_hand INTO v_onhand
  FROM public.ip_lot_locations ill
  WHERE ill.lot_id = p_lot_id AND ill.study_id = p_study_id AND ill.study_site_id = p_study_site_id;

  IF v_onhand IS NULL OR v_onhand <= 0 THEN
    RAISE EXCEPTION 'No on-hand quantity at this site for this lot';
  END IF;

  IF v_cur_serial IS NOT NULL AND BTRIM(v_cur_serial) <> '' THEN
    RAISE EXCEPTION 'This lot already has a serial number';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.ip_lots l2
    WHERE l2.item_id = v_item_id AND l2.id <> p_lot_id
      AND COALESCE(l2.serial_number, '') = v_sn
  ) THEN
    RAISE EXCEPTION 'This serial number is already assigned to another lot for this catalog item';
  END IF;

  UPDATE public.ip_lots SET serial_number = v_sn WHERE id = p_lot_id;

  PERFORM public.ip_ensure_site_lot_receipt_mirror_if_missing(p_study_id, p_lot_id, p_study_site_id);
END;
$$;

COMMENT ON FUNCTION public.ip_set_site_lot_serial(UUID, UUID, UUID, TEXT) IS
  'Sets ip_lots.serial_number when empty for a lot on-hand at a site; ensures dispatch_mirror receipt ledger on the site lot when missing so logs show Received by / date.';
