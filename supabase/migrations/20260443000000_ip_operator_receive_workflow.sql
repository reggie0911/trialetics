-- Align operator "Received" UX with metrics: exclude mirror/system rows from log view;
-- unify pending-receive qty for dispatch site lots; allow ip_receive_at_site ledger-only ack.

-- ---------------------------------------------------------------------------
-- 1) ip_v_log_rows: Device status shows operator receipt only (matches site_shipments)
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
  ) AS verified_by_name,
  l.expiry_date
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
    AND COALESCE(e.metadata->>'dispatch_mirror', '') <> 'true'
    AND COALESCE(e.metadata->>'system_fulfillment', '') <> 'true'
  ORDER BY e.performed_at DESC
  LIMIT 1
) recv_le ON TRUE
LEFT JOIN public.profiles recv_p ON recv_p.id = recv_le.performed_by_profile_id
LEFT JOIN public.profiles ver_p ON ver_p.id = ill.verified_by_profile_id
WHERE ill.study_site_id IS NOT NULL;

GRANT SELECT ON public.ip_v_log_rows TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) ip_in_transit_lines: pending operator receive (legacy in-transit OR dispatch ack gap)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ip_in_transit_lines(
  p_study_id UUID,
  p_study_site_id UUID DEFAULT NULL
) RETURNS TABLE (
  lot_id UUID,
  study_site_id UUID,
  item_id UUID,
  item_name TEXT,
  lot_number TEXT,
  serial_number TEXT,
  qty_in_transit BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH loc AS (
    SELECT ill.lot_id, ill.study_site_id, ill.quantity_on_hand::BIGINT AS onhand
    FROM public.ip_lot_locations ill
    WHERE ill.study_id = p_study_id
      AND ill.study_site_id IS NOT NULL
  ),
  ledger_agg AS (
    SELECT
      e.lot_id,
      e.to_study_site_id AS study_site_id,
      SUM(CASE WHEN e.entry_type = 'shipped_to_site' THEN e.quantity_delta ELSE 0 END)::BIGINT AS shipped,
      SUM(CASE WHEN e.entry_type = 'received_at_site' THEN e.quantity_delta ELSE 0 END)::BIGINT AS recv_all,
      SUM(
        CASE
          WHEN e.entry_type = 'received_at_site'
            AND COALESCE(e.metadata->>'dispatch_mirror', '') <> 'true'
            AND COALESCE(e.metadata->>'system_fulfillment', '') <> 'true'
          THEN e.quantity_delta
          ELSE 0
        END
      )::BIGINT AS recv_op
    FROM public.ip_ledger_entries e
    WHERE e.study_id = p_study_id
      AND e.to_study_site_id IS NOT NULL
    GROUP BY e.lot_id, e.to_study_site_id
  ),
  keys AS (
    SELECT loc.lot_id, loc.study_site_id FROM loc
    UNION
    SELECT ledger_agg.lot_id, ledger_agg.study_site_id FROM ledger_agg
  ),
  computed AS (
    SELECT
      k.lot_id,
      k.study_site_id,
      CASE
        WHEN GREATEST(0, COALESCE(la.shipped, 0) - COALESCE(la.recv_all, 0)) > 0 THEN
          GREATEST(0, COALESCE(la.shipped, 0) - COALESCE(la.recv_all, 0))
        ELSE
          GREATEST(0, COALESCE(lc.onhand, 0) - COALESCE(la.recv_op, 0))
      END::BIGINT AS pending_qty
    FROM keys k
    LEFT JOIN ledger_agg la ON la.lot_id = k.lot_id AND la.study_site_id = k.study_site_id
    LEFT JOIN loc lc ON lc.lot_id = k.lot_id AND lc.study_site_id = k.study_site_id
  )
  SELECT
    c.lot_id,
    c.study_site_id,
    i.id,
    i.name,
    l.lot_number,
    l.serial_number,
    c.pending_qty
  FROM computed c
  JOIN public.ip_lots l ON l.id = c.lot_id
  JOIN public.ip_items i ON i.id = l.item_id
  WHERE c.pending_qty > 0
    AND (p_study_site_id IS NULL OR c.study_site_id = p_study_site_id);
$$;

COMMENT ON FUNCTION public.ip_in_transit_lines(UUID, UUID) IS
  'Open receive quantity per lot/site: legacy shipped−received when > 0; else on_hand minus operator received_at_site (excludes dispatch_mirror and system_fulfillment).';

GRANT EXECUTE ON FUNCTION public.ip_in_transit_lines(UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) ip_receive_at_site: ledger-only operator acknowledgment for dispatch site lots
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ip_receive_at_site(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID,
  p_quantity INTEGER,
  p_received_at TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_serial_number TEXT DEFAULT NULL,
  p_system_fulfillment BOOLEAN DEFAULT FALSE
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile UUID;
  v_site_num TEXT;
  v_site_name TEXT;
  v_legacy_in_transit INTEGER;
  v_operator_recv INTEGER;
  v_onhand INTEGER;
  v_pending_ack INTEGER;
  v_updated INTEGER;
  v_meta JSONB;
  v_sn TEXT;
  v_item_id UUID;
  v_cur_serial TEXT;
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
  INTO v_legacy_in_transit
  FROM public.ip_ledger_entries e
  WHERE e.study_id = p_study_id AND e.lot_id = p_lot_id;

  SELECT COALESCE(SUM(e.quantity_delta), 0)
  INTO v_operator_recv
  FROM public.ip_ledger_entries e
  WHERE e.study_id = p_study_id
    AND e.lot_id = p_lot_id
    AND e.to_study_site_id = p_study_site_id
    AND e.entry_type = 'received_at_site'
    AND COALESCE(e.metadata->>'dispatch_mirror', '') <> 'true'
    AND COALESCE(e.metadata->>'system_fulfillment', '') <> 'true';

  SELECT ill.quantity_on_hand INTO v_onhand
  FROM public.ip_lot_locations ill
  WHERE ill.study_id = p_study_id
    AND ill.lot_id = p_lot_id
    AND ill.study_site_id = p_study_site_id;

  v_onhand := COALESCE(v_onhand, 0);
  v_legacy_in_transit := COALESCE(v_legacy_in_transit, 0);
  v_operator_recv := COALESCE(v_operator_recv, 0);

  v_pending_ack := CASE
    WHEN v_legacy_in_transit > 0 THEN v_legacy_in_transit
    ELSE GREATEST(0, v_onhand - v_operator_recv)
  END;

  IF v_legacy_in_transit >= p_quantity THEN
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
  ELSIF NOT p_system_fulfillment AND v_pending_ack >= p_quantity AND v_onhand >= p_quantity THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Insufficient quantity sent to this site but not yet received for this lot';
  END IF;

  v_meta := jsonb_strip_nulls(
    jsonb_build_object(
      'received_at', p_received_at,
      'notes', NULLIF(TRIM(BOTH FROM COALESCE(p_notes, '')), ''),
      'system_fulfillment', CASE WHEN p_system_fulfillment THEN 'true' ELSE NULL END
    )
  );
  IF v_meta IS NULL OR v_meta = 'null'::jsonb OR v_meta = '{}'::jsonb THEN
    v_meta := '{}'::jsonb;
  END IF;

  PERFORM public.ip_internal_insert_ledger(
    p_study_id, p_lot_id, 'received_at_site', p_quantity,
    NULL, p_study_site_id, NULL, NULL, v_site_num, v_site_name, NULL, v_profile, v_meta
  );

  v_sn := NULLIF(BTRIM(COALESCE(p_serial_number, '')), '');
  IF v_sn IS NULL THEN
    RETURN;
  END IF;

  SELECT l.item_id, l.serial_number INTO v_item_id, v_cur_serial
  FROM public.ip_lots l
  WHERE l.id = p_lot_id
  FOR UPDATE;

  IF v_cur_serial IS NOT NULL AND BTRIM(v_cur_serial) <> '' THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.ip_lots l2
    WHERE l2.item_id = v_item_id AND l2.id <> p_lot_id
      AND COALESCE(l2.serial_number, '') = v_sn
  ) THEN
    RAISE EXCEPTION 'This serial number is already assigned to another lot for this catalog item';
  END IF;

  UPDATE public.ip_lots SET serial_number = v_sn WHERE id = p_lot_id;
END;
$$;

COMMENT ON FUNCTION public.ip_receive_at_site(UUID, UUID, UUID, INTEGER, TIMESTAMPTZ, TEXT, TEXT, BOOLEAN) IS
  'Receive at site: legacy path bumps ip_lot_locations when raw in-transit remains; dispatch path records operator received_at_site only when stock is already on site (no double count).';

GRANT EXECUTE ON FUNCTION public.ip_receive_at_site(UUID, UUID, UUID, INTEGER, TIMESTAMPTZ, TEXT, TEXT, BOOLEAN) TO authenticated;
