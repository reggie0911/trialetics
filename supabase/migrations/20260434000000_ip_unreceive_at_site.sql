-- Reverse an erroneous site receipt: decrement site on-hand without returning stock to the global pool.
-- Posts received_at_site with negative quantity_delta (append-only ledger). Company / platform admins only.

CREATE OR REPLACE FUNCTION public.ip_unreceive_at_site(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID,
  p_quantity INTEGER,
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
  v_qoh INTEGER;
  v_qav INTEGER;
  v_net_recv INTEGER;
  v_meta JSONB;
  v_updated INTEGER;
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
    RAISE EXCEPTION 'Only a company or platform administrator can reverse a receipt';
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
  IF v_site_num IS NULL THEN
    RAISE EXCEPTION 'Site not in study';
  END IF;

  SELECT disposition, quantity_on_hand, quantity_available
  INTO v_disp, v_qoh, v_qav
  FROM public.ip_lot_locations
  WHERE lot_id = p_lot_id AND study_site_id = p_study_site_id AND study_id = p_study_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lot location not found at site';
  END IF;

  IF v_disp IS DISTINCT FROM 'available' THEN
    RAISE EXCEPTION 'Receipt can only be reversed when the line is available (unused)';
  END IF;

  IF v_qoh IS NULL OR v_qoh < p_quantity OR v_qav IS NULL OR v_qav < p_quantity THEN
    RAISE EXCEPTION 'Insufficient available quantity at site to reverse this receipt';
  END IF;

  SELECT COALESCE(SUM(e.quantity_delta), 0)::INT INTO v_net_recv
  FROM public.ip_ledger_entries e
  WHERE e.study_id = p_study_id
    AND e.lot_id = p_lot_id
    AND e.to_study_site_id = p_study_site_id
    AND e.entry_type = 'received_at_site';

  IF v_net_recv < p_quantity THEN
    RAISE EXCEPTION 'Cannot reverse more than was recorded as received for this lot at this site';
  END IF;

  UPDATE public.ip_lot_locations
  SET quantity_on_hand = quantity_on_hand - p_quantity,
      quantity_available = quantity_available - p_quantity,
      updated_at = NOW()
  WHERE lot_id = p_lot_id AND study_site_id = p_study_site_id AND study_id = p_study_id;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Lot location not found at site';
  END IF;

  v_meta := jsonb_strip_nulls(
    jsonb_build_object(
      'receipt_reversal', TRUE,
      'notes', NULLIF(TRIM(BOTH FROM COALESCE(p_reason, '')), '')
    )
  );

  PERFORM public.ip_internal_insert_ledger(
    p_study_id, p_lot_id, 'received_at_site', -p_quantity,
    NULL, p_study_site_id, NULL, NULL, v_site_num, v_site_name, NULL, v_profile, COALESCE(v_meta, '{}'::jsonb)
  );
END;
$$;

COMMENT ON FUNCTION public.ip_unreceive_at_site(UUID, UUID, UUID, INTEGER, TEXT) IS
  'Admin-only: reverse mistaken site receipt (decrements site on-hand; negative received_at_site ledger; global pool unchanged).';

GRANT EXECUTE ON FUNCTION public.ip_unreceive_at_site(UUID, UUID, UUID, INTEGER, TEXT) TO authenticated;

-- Logs UI: show last positive receipt, not the latest reversal row.
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
  ) AS verified_by_name
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
  SELECT e.performed_at, e.subject_number_snapshot, e.performed_by_profile_id
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
  ORDER BY e.performed_at DESC
  LIMIT 1
) recv_le ON TRUE
LEFT JOIN public.profiles recv_p ON recv_p.id = recv_le.performed_by_profile_id
LEFT JOIN public.profiles ver_p ON ver_p.id = ill.verified_by_profile_id
WHERE ill.study_site_id IS NOT NULL;

GRANT SELECT ON public.ip_v_log_rows TO authenticated;
