-- Inventory trace id: disambiguate duplicate serial/lot/batch per item; link ip_orders to traced lots.

ALTER TABLE public.ip_lots
  ADD COLUMN IF NOT EXISTS inventory_trace_id UUID NULL;

ALTER TABLE public.ip_orders
  ADD COLUMN IF NOT EXISTS inventory_trace_id UUID NULL;

COMMENT ON COLUMN public.ip_lots.inventory_trace_id IS
  'Set for Add-order lines when a new lot instance is created; NULL for legacy Add-inventory merge lots.';
COMMENT ON COLUMN public.ip_orders.inventory_trace_id IS
  'Matches ip_lots.inventory_trace_id when the order created a traced lot line; NULL for legacy orders.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_ip_lots_inventory_trace_id
  ON public.ip_lots (inventory_trace_id)
  WHERE inventory_trace_id IS NOT NULL;

DROP INDEX IF EXISTS uq_ip_lots_item_identifiers;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ip_lots_legacy_item_identifiers
  ON public.ip_lots (
    item_id,
    COALESCE(serial_number, ''),
    COALESCE(lot_number, ''),
    COALESCE(batch_number, '')
  )
  WHERE inventory_trace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_ip_lots_item_traced
  ON public.ip_lots (item_id)
  WHERE inventory_trace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ip_orders_inventory_trace_id
  ON public.ip_orders (inventory_trace_id)
  WHERE inventory_trace_id IS NOT NULL;

-- Replace initial receipt RPC: merge only legacy lots; optional forced traced lot.
DROP FUNCTION IF EXISTS public.ip_initial_global_receipt(UUID, UUID, INTEGER, TEXT, TEXT, TEXT, DATE, JSONB);

CREATE OR REPLACE FUNCTION public.ip_initial_global_receipt(
  p_study_id UUID,
  p_item_id UUID,
  p_quantity INTEGER,
  p_lot_number TEXT DEFAULT NULL,
  p_serial_number TEXT DEFAULT NULL,
  p_batch_number TEXT DEFAULT NULL,
  p_expiry_date DATE DEFAULT NULL,
  p_receipt_metadata JSONB DEFAULT '{}'::JSONB,
  p_inventory_trace_id UUID DEFAULT NULL
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

  IF p_inventory_trace_id IS NOT NULL THEN
    INSERT INTO public.ip_lots (
      item_id, serial_number, lot_number, batch_number, expiry_date, inventory_trace_id
    )
    VALUES (
      p_item_id, p_serial_number, p_lot_number, p_batch_number, p_expiry_date, p_inventory_trace_id
    )
    RETURNING id INTO v_lot_id;
  ELSE
    SELECT l.id INTO v_lot_id
    FROM public.ip_lots l
    WHERE l.item_id = p_item_id
      AND l.inventory_trace_id IS NULL
      AND COALESCE(l.serial_number, '') = COALESCE(p_serial_number, '')
      AND COALESCE(l.lot_number, '') = COALESCE(p_lot_number, '')
      AND COALESCE(l.batch_number, '') = COALESCE(p_batch_number, '');

    IF v_lot_id IS NULL THEN
      INSERT INTO public.ip_lots (
        item_id, serial_number, lot_number, batch_number, expiry_date, inventory_trace_id
      )
      VALUES (
        p_item_id, p_serial_number, p_lot_number, p_batch_number, p_expiry_date, NULL
      )
      RETURNING id INTO v_lot_id;
    END IF;
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

GRANT EXECUTE ON FUNCTION public.ip_initial_global_receipt(UUID, UUID, INTEGER, TEXT, TEXT, TEXT, DATE, JSONB, UUID) TO authenticated;
