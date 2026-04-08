-- Extend initial global receipt with ledger metadata; storage for receipt images.

DROP FUNCTION IF EXISTS public.ip_initial_global_receipt(UUID, UUID, INTEGER, TEXT, TEXT, TEXT, DATE);

CREATE OR REPLACE FUNCTION public.ip_initial_global_receipt(
  p_study_id UUID,
  p_item_id UUID,
  p_quantity INTEGER,
  p_lot_number TEXT DEFAULT NULL,
  p_serial_number TEXT DEFAULT NULL,
  p_batch_number TEXT DEFAULT NULL,
  p_expiry_date DATE DEFAULT NULL,
  p_receipt_metadata JSONB DEFAULT '{}'::JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile UUID;
  v_lot_id UUID;
  v_updated INTEGER;
BEGIN
  PERFORM public.ip_assert_study_company(p_study_id);
  v_profile := public.ip_resolve_caller_profile_id();
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ip_items i WHERE i.id = p_item_id AND i.study_id = p_study_id) THEN
    RAISE EXCEPTION 'Item not in study';
  END IF;

  SELECT l.id INTO v_lot_id
  FROM public.ip_lots l
  WHERE l.item_id = p_item_id
    AND COALESCE(l.serial_number, '') = COALESCE(p_serial_number, '')
    AND COALESCE(l.lot_number, '') = COALESCE(p_lot_number, '')
    AND COALESCE(l.batch_number, '') = COALESCE(p_batch_number, '');

  IF v_lot_id IS NULL THEN
    INSERT INTO public.ip_lots (item_id, serial_number, lot_number, batch_number, expiry_date)
    VALUES (p_item_id, p_serial_number, p_lot_number, p_batch_number, p_expiry_date)
    RETURNING id INTO v_lot_id;
  END IF;

  UPDATE public.ip_lot_locations
  SET quantity_on_hand = quantity_on_hand + p_quantity,
      quantity_available = quantity_available + p_quantity,
      disposition = 'available',
      updated_at = NOW()
  WHERE lot_id = v_lot_id AND study_site_id IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    INSERT INTO public.ip_lot_locations (lot_id, study_id, study_site_id, quantity_on_hand, quantity_available, disposition)
    VALUES (v_lot_id, p_study_id, NULL, p_quantity, p_quantity, 'available');
  END IF;

  PERFORM public.ip_internal_insert_ledger(
    p_study_id, v_lot_id, 'initial_global_receipt', p_quantity,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, v_profile, COALESCE(p_receipt_metadata, '{}'::JSONB)
  );

  RETURN v_lot_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ip_initial_global_receipt(UUID, UUID, INTEGER, TEXT, TEXT, TEXT, DATE, JSONB) TO authenticated;

-- Storage bucket for add-inventory images (private; authenticated upload/read/delete)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ip-receipt-attachments',
  'ip-receipt-attachments',
  false,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']::text[];

DROP POLICY IF EXISTS "ip_receipt_attachments_upload" ON storage.objects;
CREATE POLICY "ip_receipt_attachments_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'ip-receipt-attachments' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "ip_receipt_attachments_select" ON storage.objects;
CREATE POLICY "ip_receipt_attachments_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'ip-receipt-attachments' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "ip_receipt_attachments_update" ON storage.objects;
CREATE POLICY "ip_receipt_attachments_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'ip-receipt-attachments' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "ip_receipt_attachments_delete" ON storage.objects;
CREATE POLICY "ip_receipt_attachments_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'ip-receipt-attachments' AND auth.uid() IS NOT NULL);
