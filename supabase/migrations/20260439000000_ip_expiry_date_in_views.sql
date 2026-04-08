-- Surface ip_lots.expiry_date in ip_v_log_rows so the UI can show
-- expired / near-expiry badges without an extra query.

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
  ORDER BY e.performed_at DESC
  LIMIT 1
) recv_le ON TRUE
LEFT JOIN public.profiles recv_p ON recv_p.id = recv_le.performed_by_profile_id
LEFT JOIN public.profiles ver_p ON ver_p.id = ill.verified_by_profile_id
WHERE ill.study_site_id IS NOT NULL;

GRANT SELECT ON public.ip_v_log_rows TO authenticated;
