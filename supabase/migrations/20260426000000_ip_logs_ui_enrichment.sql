-- Inventory logs UI: row notes, enriched ip_v_log_rows (order link, actor names), verify metadata.

ALTER TABLE public.ip_lot_locations
  ADD COLUMN IF NOT EXISTS notes TEXT NULL;

COMMENT ON COLUMN public.ip_lot_locations.notes IS
  'Site-level inventory line notes (compliance / handling); editable via ip_update_lot_location_notes.';

-- ---------------------------------------------------------------------------
-- ip_verify_lot: optional comment + date-of-use stored in ledger metadata
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.ip_verify_lot(UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION public.ip_verify_lot(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID,
  p_comment TEXT DEFAULT NULL,
  p_used_at TIMESTAMPTZ DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile UUID;
  v_site_num TEXT;
  v_site_name TEXT;
  v_meta JSONB;
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

  v_meta := jsonb_strip_nulls(
    jsonb_build_object(
      'comment', NULLIF(TRIM(BOTH FROM COALESCE(p_comment, '')), ''),
      'date_of_use', p_used_at
    )
  );
  IF v_meta = '{}'::JSONB THEN
    v_meta := '{}'::JSONB;
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
    p_study_site_id, NULL, NULL, NULL, v_site_num, v_site_name, NULL, v_profile, v_meta
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ip_verify_lot(UUID, UUID, UUID, TEXT, TIMESTAMPTZ) TO authenticated;

-- ---------------------------------------------------------------------------
-- Update site line notes (RPC only)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ip_update_lot_location_notes(
  p_location_id UUID,
  p_notes TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_study_id UUID;
BEGIN
  SELECT ill.study_id INTO v_study_id
  FROM public.ip_lot_locations ill
  WHERE ill.id = p_location_id AND ill.study_site_id IS NOT NULL;
  IF v_study_id IS NULL THEN
    RAISE EXCEPTION 'Site lot location not found';
  END IF;
  PERFORM public.ip_assert_study_company(v_study_id);

  UPDATE public.ip_lot_locations
  SET notes = NULLIF(TRIM(BOTH FROM COALESCE(p_notes, '')), ''),
      updated_at = NOW()
  WHERE id = p_location_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ip_update_lot_location_notes(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- Enriched log rows view (order pick: prefer active order, then latest created)
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
  ORDER BY e.performed_at DESC
  LIMIT 1
) recv_le ON TRUE
LEFT JOIN public.profiles recv_p ON recv_p.id = recv_le.performed_by_profile_id
LEFT JOIN public.profiles ver_p ON ver_p.id = ill.verified_by_profile_id
WHERE ill.study_site_id IS NOT NULL;

GRANT SELECT ON public.ip_v_log_rows TO authenticated;
