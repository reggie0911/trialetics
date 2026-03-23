-- =====================================================
-- Investigational Product (IP) Management
-- Ledger-first inventory: append-only ip_ledger_entries,
-- current state on ip_lot_locations, SECURITY DEFINER RPCs for writes.
-- =====================================================

-- ---------------------------------------------------------------------------
-- Types (as CHECK constraints / text enums)
-- ip_items.category: investigational_drug | investigational_device | medical_equipment | study_supplies
-- ip_lot_locations.disposition: available | used | transferred | returned | destroyed
-- ip_ledger_entries.entry_type: see CHECK below
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ip_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'investigational_drug',
    'investigational_device',
    'medical_equipment',
    'study_supplies'
  )),
  unit TEXT NOT NULL DEFAULT 'Each',
  part_or_material_number TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_items_study_id ON public.ip_items(study_id);
CREATE INDEX IF NOT EXISTS idx_ip_items_category ON public.ip_items(category);

CREATE TRIGGER update_ip_items_updated_at
  BEFORE UPDATE ON public.ip_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ip_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  study_site_id UUID REFERENCES public.study_sites(id) ON DELETE SET NULL,
  order_reference TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_orders_study_id ON public.ip_orders(study_id);

CREATE TRIGGER update_ip_orders_updated_at
  BEFORE UPDATE ON public.ip_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ip_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.ip_items(id) ON DELETE CASCADE,
  serial_number TEXT,
  lot_number TEXT,
  batch_number TEXT,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ip_lots_item_identifiers
  ON public.ip_lots (
    item_id,
    COALESCE(serial_number, ''),
    COALESCE(lot_number, ''),
    COALESCE(batch_number, '')
  );

CREATE INDEX IF NOT EXISTS idx_ip_lots_item_id ON public.ip_lots(item_id);

CREATE TRIGGER update_ip_lots_updated_at
  BEFORE UPDATE ON public.ip_lots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ip_lot_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES public.ip_lots(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  study_site_id UUID REFERENCES public.study_sites(id) ON DELETE CASCADE,
  quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  quantity_available INTEGER NOT NULL DEFAULT 0 CHECK (quantity_available >= 0 AND quantity_available <= quantity_on_hand),
  disposition TEXT NOT NULL DEFAULT 'available' CHECK (disposition IN (
    'available', 'used', 'transferred', 'returned', 'destroyed'
  )),
  verified_at TIMESTAMPTZ,
  verified_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per lot per place: global (site null) or site
CREATE UNIQUE INDEX IF NOT EXISTS uq_ip_lot_locations_lot_global
  ON public.ip_lot_locations (lot_id)
  WHERE study_site_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ip_lot_locations_lot_site
  ON public.ip_lot_locations (lot_id, study_site_id)
  WHERE study_site_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ip_lot_locations_study_id ON public.ip_lot_locations(study_id);
CREATE INDEX IF NOT EXISTS idx_ip_lot_locations_study_site_id ON public.ip_lot_locations(study_site_id);
CREATE INDEX IF NOT EXISTS idx_ip_lot_locations_lot_id ON public.ip_lot_locations(lot_id);

CREATE TRIGGER update_ip_lot_locations_updated_at
  BEFORE UPDATE ON public.ip_lot_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ip_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  lot_id UUID NOT NULL REFERENCES public.ip_lots(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'initial_global_receipt',
    'shipped_to_site',
    'received_at_site',
    'dispensed',
    'returned_to_global',
    'transferred_out',
    'transferred_in',
    'destroyed',
    'verified',
    'reconcile_adjustment'
  )),
  quantity_delta INTEGER NOT NULL,
  from_study_site_id UUID REFERENCES public.study_sites(id) ON DELETE SET NULL,
  to_study_site_id UUID REFERENCES public.study_sites(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  subject_number_snapshot TEXT,
  site_number_snapshot TEXT,
  site_name_snapshot TEXT,
  ip_order_id UUID REFERENCES public.ip_orders(id) ON DELETE SET NULL,
  performed_by_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_ip_ledger_study_id ON public.ip_ledger_entries(study_id);
CREATE INDEX IF NOT EXISTS idx_ip_ledger_lot_id ON public.ip_ledger_entries(lot_id);
CREATE INDEX IF NOT EXISTS idx_ip_ledger_performed_at ON public.ip_ledger_entries(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ip_ledger_entry_type ON public.ip_ledger_entries(entry_type);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.ip_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_lot_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ip_items_select" ON public.ip_items
  FOR SELECT USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "ip_items_insert" ON public.ip_items
  FOR INSERT WITH CHECK (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "ip_items_update" ON public.ip_items
  FOR UPDATE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "ip_items_delete" ON public.ip_items
  FOR DELETE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "ip_orders_select" ON public.ip_orders
  FOR SELECT USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "ip_orders_insert" ON public.ip_orders
  FOR INSERT WITH CHECK (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "ip_orders_update" ON public.ip_orders
  FOR UPDATE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "ip_orders_delete" ON public.ip_orders
  FOR DELETE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "ip_lots_select" ON public.ip_lots
  FOR SELECT USING (
    item_id IN (
      SELECT ii.id FROM public.ip_items ii
      JOIN public.studies s ON s.id = ii.study_id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "ip_lots_insert" ON public.ip_lots
  FOR INSERT WITH CHECK (
    item_id IN (
      SELECT ii.id FROM public.ip_items ii
      JOIN public.studies s ON s.id = ii.study_id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "ip_lots_update" ON public.ip_lots
  FOR UPDATE USING (
    item_id IN (
      SELECT ii.id FROM public.ip_items ii
      JOIN public.studies s ON s.id = ii.study_id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "ip_lots_delete" ON public.ip_lots
  FOR DELETE USING (
    item_id IN (
      SELECT ii.id FROM public.ip_items ii
      JOIN public.studies s ON s.id = ii.study_id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "ip_lot_locations_select" ON public.ip_lot_locations
  FOR SELECT USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "ip_lot_locations_insert" ON public.ip_lot_locations
  FOR INSERT WITH CHECK (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "ip_lot_locations_update" ON public.ip_lot_locations
  FOR UPDATE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "ip_lot_locations_delete" ON public.ip_lot_locations
  FOR DELETE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- Ledger: read-only for authenticated (writes only via SECURITY DEFINER RPCs as table owner)
CREATE POLICY "ip_ledger_select" ON public.ip_ledger_entries
  FOR SELECT USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Helper: resolve caller profile + study company (used inside RPCs)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ip_resolve_caller_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.ip_assert_study_company(p_study_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company UUID;
  v_profile_company UUID;
BEGIN
  SELECT company_id INTO v_company FROM public.studies WHERE id = p_study_id;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Study not found';
  END IF;
  SELECT company_id INTO v_profile_company FROM public.profiles WHERE user_id = auth.uid();
  IF v_profile_company IS NULL OR v_profile_company <> v_company THEN
    RAISE EXCEPTION 'Not authorized for this study';
  END IF;
  RETURN v_company;
END;
$$;

-- ---------------------------------------------------------------------------
-- Internal: insert ledger (caller must be trusted RPC only)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ip_internal_insert_ledger(
  p_study_id UUID,
  p_lot_id UUID,
  p_entry_type TEXT,
  p_quantity_delta INTEGER,
  p_from_site UUID,
  p_to_site UUID,
  p_subject_id UUID,
  p_subject_number_snapshot TEXT,
  p_site_number_snapshot TEXT,
  p_site_name_snapshot TEXT,
  p_order_id UUID,
  p_profile_id UUID,
  p_metadata JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.ip_ledger_entries (
    study_id, lot_id, entry_type, quantity_delta,
    from_study_site_id, to_study_site_id,
    subject_id, subject_number_snapshot, site_number_snapshot, site_name_snapshot,
    ip_order_id, performed_by_profile_id, metadata
  ) VALUES (
    p_study_id, p_lot_id, p_entry_type, p_quantity_delta,
    p_from_site, p_to_site,
    p_subject_id, p_subject_number_snapshot, p_site_number_snapshot, p_site_name_snapshot,
    p_order_id, p_profile_id, COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: create catalog item
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ip_create_item(
  p_study_id UUID,
  p_name TEXT,
  p_category TEXT,
  p_unit TEXT DEFAULT 'Each',
  p_part_or_material_number TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile UUID;
  v_id UUID;
BEGIN
  PERFORM public.ip_assert_study_company(p_study_id);
  v_profile := public.ip_resolve_caller_profile_id();
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  INSERT INTO public.ip_items (study_id, name, category, unit, part_or_material_number)
  VALUES (p_study_id, p_name, p_category, COALESCE(NULLIF(trim(p_unit), ''), 'Each'), p_part_or_material_number)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: initial receipt into global pool (creates lot if needed)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ip_initial_global_receipt(
  p_study_id UUID,
  p_item_id UUID,
  p_quantity INTEGER,
  p_lot_number TEXT DEFAULT NULL,
  p_serial_number TEXT DEFAULT NULL,
  p_batch_number TEXT DEFAULT NULL,
  p_expiry_date DATE DEFAULT NULL
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
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, v_profile, '{}'::jsonb
  );

  RETURN v_lot_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: ship from global pool toward a site (in transit until receive_at_site)
-- Decrements global only; site on-hand increases in ip_receive_at_site.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ip_ship_to_site(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID,
  p_quantity INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile UUID;
  v_global_q INTEGER;
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

  SELECT quantity_on_hand INTO v_global_q
  FROM public.ip_lot_locations
  WHERE lot_id = p_lot_id AND study_site_id IS NULL;
  IF v_global_q IS NULL OR v_global_q < p_quantity THEN
    RAISE EXCEPTION 'Insufficient global quantity';
  END IF;

  UPDATE public.ip_lot_locations
  SET quantity_on_hand = quantity_on_hand - p_quantity,
      quantity_available = GREATEST(0, quantity_available - p_quantity),
      updated_at = NOW()
  WHERE lot_id = p_lot_id AND study_site_id IS NULL;

  PERFORM public.ip_internal_insert_ledger(
    p_study_id, p_lot_id, 'shipped_to_site', p_quantity,
    NULL, p_study_site_id, NULL, NULL, NULL, NULL, NULL, v_profile, '{}'::jsonb
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: receive in-transit quantity at site (ledger received_at_site + on-hand)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ip_receive_at_site(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID,
  p_quantity INTEGER
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

  PERFORM public.ip_internal_insert_ledger(
    p_study_id, p_lot_id, 'received_at_site', p_quantity,
    NULL, p_study_site_id, NULL, NULL, v_site_num, v_site_name, NULL, v_profile, '{}'::jsonb
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: dispense at site (decrements available / on_hand; snapshot subject)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ip_dispense(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID,
  p_quantity INTEGER,
  p_subject_id UUID
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
BEGIN
  PERFORM public.ip_assert_study_company(p_study_id);
  v_profile := public.ip_resolve_caller_profile_id();
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;
  SELECT s.subject_number INTO v_subj_num
  FROM public.subjects s
  WHERE s.id = p_subject_id AND s.study_id = p_study_id;
  IF v_subj_num IS NULL THEN
    RAISE EXCEPTION 'Subject not in study';
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
    p_study_site_id, NULL, p_subject_id, v_subj_num, v_site_num, v_site_name, NULL, v_profile, '{}'::jsonb
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: verify (ledger + flags on site location row)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ip_verify_lot(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile UUID;
  v_site_num TEXT;
  v_site_name TEXT;
BEGIN
  PERFORM public.ip_assert_study_company(p_study_id);
  v_profile := public.ip_resolve_caller_profile_id();
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT ss.site_number, ss.name INTO v_site_num, v_site_name
  FROM public.study_sites ss
  WHERE ss.id = p_study_site_id AND ss.study_id = p_study_id;
  IF v_site_num IS NULL THEN
    RAISE EXCEPTION 'Site not in study';
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
    p_study_site_id, NULL, NULL, NULL, v_site_num, v_site_name, NULL, v_profile, '{}'::jsonb
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: return from site to global
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ip_return_to_global(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID,
  p_quantity INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile UUID;
  v_onhand INTEGER;
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

  SELECT quantity_on_hand INTO v_onhand
  FROM public.ip_lot_locations
  WHERE lot_id = p_lot_id AND study_site_id = p_study_site_id;
  IF v_onhand IS NULL OR v_onhand < p_quantity THEN
    RAISE EXCEPTION 'Insufficient quantity at site';
  END IF;

  UPDATE public.ip_lot_locations
  SET quantity_on_hand = quantity_on_hand - p_quantity,
      quantity_available = LEAST(quantity_available, quantity_on_hand - p_quantity),
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
    p_study_site_id, NULL, NULL, NULL, NULL, NULL, NULL, v_profile, '{}'::jsonb
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: transfer between sites (paired ledger conceptual: out + in)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ip_transfer_site(
  p_study_id UUID,
  p_lot_id UUID,
  p_from_site_id UUID,
  p_to_site_id UUID,
  p_quantity INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile UUID;
  v_onhand INTEGER;
  v_updated INTEGER;
BEGIN
  PERFORM public.ip_assert_study_company(p_study_id);
  v_profile := public.ip_resolve_caller_profile_id();
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_from_site_id = p_to_site_id THEN
    RAISE EXCEPTION 'From and to site must differ';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;

  SELECT quantity_on_hand INTO v_onhand
  FROM public.ip_lot_locations
  WHERE lot_id = p_lot_id AND study_site_id = p_from_site_id;
  IF v_onhand IS NULL OR v_onhand < p_quantity THEN
    RAISE EXCEPTION 'Insufficient quantity at source site';
  END IF;

  UPDATE public.ip_lot_locations
  SET quantity_on_hand = quantity_on_hand - p_quantity,
      quantity_available = LEAST(quantity_available, quantity_on_hand - p_quantity),
      updated_at = NOW()
  WHERE lot_id = p_lot_id AND study_site_id = p_from_site_id;

  UPDATE public.ip_lot_locations
  SET quantity_on_hand = quantity_on_hand + p_quantity,
      quantity_available = quantity_available + p_quantity,
      disposition = 'available',
      updated_at = NOW()
  WHERE lot_id = p_lot_id AND study_site_id = p_to_site_id;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    INSERT INTO public.ip_lot_locations (lot_id, study_id, study_site_id, quantity_on_hand, quantity_available, disposition)
    VALUES (p_lot_id, p_study_id, p_to_site_id, p_quantity, p_quantity, 'available');
  END IF;

  PERFORM public.ip_internal_insert_ledger(
    p_study_id, p_lot_id, 'transferred_out', -p_quantity,
    p_from_site_id, p_to_site_id, NULL, NULL, NULL, NULL, NULL, v_profile, '{}'::jsonb
  );
  PERFORM public.ip_internal_insert_ledger(
    p_study_id, p_lot_id, 'transferred_in', p_quantity,
    p_from_site_id, p_to_site_id, NULL, NULL, NULL, NULL, NULL, v_profile, '{}'::jsonb
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: destroy at site
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ip_destroy_at_site(
  p_study_id UUID,
  p_lot_id UUID,
  p_study_site_id UUID,
  p_quantity INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile UUID;
  v_onhand INTEGER;
BEGIN
  PERFORM public.ip_assert_study_company(p_study_id);
  v_profile := public.ip_resolve_caller_profile_id();
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
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
    p_study_site_id, NULL, NULL, NULL, NULL, NULL, NULL, v_profile, '{}'::jsonb
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Canonical metrics function (single definition for UI + charts + PDF)
-- Formulas (documented):
-- global_in_stock: sum quantity_on_hand for global rows (study_site_id IS NULL) per item
-- global_sent: cumulative sum of quantity_delta where entry_type = shipped_to_site (units left global)
-- global_returns: cumulative sum for returned_to_global per item
-- site_in_transit: per item, shipped_to_site minus received_at_site for selected site (or all sites)
-- site_shipments: cumulative received_at_site (physical receipt at site), not the same as global_sent
-- site_* (returned/used/transfers/destroyed): ledger sums filtered by site
-- site_onsite / site_available: from ip_lot_locations (point-in-time)
-- compliance_pct: 100 * verified_entries / NULLIF(dispensed_entries, 0) for study (+ optional site/category)
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
  SELECT
    x.lot_id,
    x.study_site_id,
    i.id,
    i.name,
    l.lot_number,
    l.serial_number,
    GREATEST(x.qty, 0)::BIGINT
  FROM (
    SELECT
      e.lot_id,
      e.to_study_site_id AS study_site_id,
      SUM(CASE WHEN e.entry_type = 'shipped_to_site' THEN e.quantity_delta ELSE 0 END)
        - SUM(CASE WHEN e.entry_type = 'received_at_site' THEN e.quantity_delta ELSE 0 END) AS qty
    FROM public.ip_ledger_entries e
    WHERE e.study_id = p_study_id
      AND e.to_study_site_id IS NOT NULL
    GROUP BY e.lot_id, e.to_study_site_id
  ) x
  JOIN public.ip_lots l ON l.id = x.lot_id
  JOIN public.ip_items i ON i.id = l.item_id
  WHERE x.qty > 0
    AND (p_study_site_id IS NULL OR x.study_site_id = p_study_site_id);
$$;

CREATE OR REPLACE FUNCTION public.ip_get_study_metrics(
  p_study_id UUID,
  p_study_site_id UUID DEFAULT NULL,
  p_category TEXT DEFAULT NULL
) RETURNS TABLE (
  item_id UUID,
  item_name TEXT,
  category TEXT,
  unit TEXT,
  global_in_stock BIGINT,
  global_sent BIGINT,
  global_returns BIGINT,
  site_in_transit BIGINT,
  site_shipments BIGINT,
  site_returned BIGINT,
  site_used BIGINT,
  site_transfers BIGINT,
  site_destroyed BIGINT,
  site_onsite BIGINT,
  site_available BIGINT,
  compliance_pct NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH items_f AS (
    SELECT i.id, i.name, i.category, i.unit
    FROM public.ip_items i
    WHERE i.study_id = p_study_id
      AND (p_category IS NULL OR p_category = '' OR i.category = p_category)
  ),
  global_stock AS (
    SELECT l.item_id, SUM(ill.quantity_on_hand)::BIGINT AS qty
    FROM public.ip_lot_locations ill
    JOIN public.ip_lots l ON l.id = ill.lot_id
    WHERE ill.study_id = p_study_id AND ill.study_site_id IS NULL
    GROUP BY l.item_id
  ),
  ledger_by_item AS (
    SELECT l.item_id, e.entry_type, SUM(e.quantity_delta)::BIGINT AS q
    FROM public.ip_ledger_entries e
    JOIN public.ip_lots l ON l.id = e.lot_id
    JOIN public.ip_items i ON i.id = l.item_id
    WHERE e.study_id = p_study_id
      AND (p_category IS NULL OR p_category = '' OR i.category = p_category)
    GROUP BY l.item_id, e.entry_type
  ),
  site_loc AS (
    SELECT l.item_id,
           SUM(ill.quantity_on_hand)::BIGINT AS onsite,
           SUM(ill.quantity_available)::BIGINT AS avail
    FROM public.ip_lot_locations ill
    JOIN public.ip_lots l ON l.id = ill.lot_id
    JOIN public.ip_items i ON i.id = l.item_id
    WHERE ill.study_id = p_study_id
      AND ill.study_site_id IS NOT NULL
      AND (p_study_site_id IS NULL OR ill.study_site_id = p_study_site_id)
      AND (p_category IS NULL OR p_category = '' OR i.category = p_category)
    GROUP BY l.item_id
  ),
  site_ledger AS (
    SELECT l.item_id,
      (
        SUM(CASE WHEN e.entry_type = 'shipped_to_site' AND (p_study_site_id IS NULL OR e.to_study_site_id = p_study_site_id) THEN e.quantity_delta ELSE 0 END)
        - SUM(CASE WHEN e.entry_type = 'received_at_site' AND (p_study_site_id IS NULL OR e.to_study_site_id = p_study_site_id) THEN e.quantity_delta ELSE 0 END)
      )::BIGINT AS in_transit,
      SUM(CASE WHEN e.entry_type = 'received_at_site' AND (p_study_site_id IS NULL OR e.to_study_site_id = p_study_site_id) THEN e.quantity_delta ELSE 0 END)::BIGINT AS shipments_received,
      SUM(CASE WHEN e.entry_type = 'returned_to_global' AND (p_study_site_id IS NULL OR e.from_study_site_id = p_study_site_id) THEN e.quantity_delta ELSE 0 END)::BIGINT AS returned,
      SUM(CASE WHEN e.entry_type = 'dispensed' AND (p_study_site_id IS NULL OR e.from_study_site_id = p_study_site_id) THEN -e.quantity_delta ELSE 0 END)::BIGINT AS used_amt,
      SUM(CASE WHEN e.entry_type IN ('transferred_out', 'transferred_in') AND (p_study_site_id IS NULL OR e.from_study_site_id = p_study_site_id OR e.to_study_site_id = p_study_site_id) THEN ABS(e.quantity_delta) ELSE 0 END)::BIGINT / 2 AS transfers,
      SUM(CASE WHEN e.entry_type = 'destroyed' AND (p_study_site_id IS NULL OR e.from_study_site_id = p_study_site_id) THEN -e.quantity_delta ELSE 0 END)::BIGINT AS destroyed_amt
    FROM public.ip_ledger_entries e
    JOIN public.ip_lots l ON l.id = e.lot_id
    JOIN public.ip_items i ON i.id = l.item_id
    WHERE e.study_id = p_study_id
      AND (p_category IS NULL OR p_category = '' OR i.category = p_category)
    GROUP BY l.item_id
  ),
  compliance AS (
    SELECT
      CASE WHEN p_study_site_id IS NULL THEN
        100.0 * (SELECT COUNT(*)::NUMERIC FROM public.ip_ledger_entries e2
                 JOIN public.ip_lots l2 ON l2.id = e2.lot_id
                 JOIN public.ip_items i2 ON i2.id = l2.item_id
                 WHERE e2.study_id = p_study_id AND e2.entry_type = 'verified'
                   AND (p_category IS NULL OR p_category = '' OR i2.category = p_category))
             / NULLIF((SELECT COUNT(*) FROM public.ip_ledger_entries e3
                 JOIN public.ip_lots l3 ON l3.id = e3.lot_id
                 JOIN public.ip_items i3 ON i3.id = l3.item_id
                 WHERE e3.study_id = p_study_id AND e3.entry_type = 'dispensed'
                   AND (p_category IS NULL OR p_category = '' OR i3.category = p_category)), 0)
      ELSE
        100.0 * (SELECT COUNT(*)::NUMERIC FROM public.ip_ledger_entries e2
                 JOIN public.ip_lots l2 ON l2.id = e2.lot_id
                 JOIN public.ip_items i2 ON i2.id = l2.item_id
                 WHERE e2.study_id = p_study_id AND e2.entry_type = 'verified'
                   AND e2.from_study_site_id = p_study_site_id
                   AND (p_category IS NULL OR p_category = '' OR i2.category = p_category))
             / NULLIF((SELECT COUNT(*) FROM public.ip_ledger_entries e3
                 JOIN public.ip_lots l3 ON l3.id = e3.lot_id
                 JOIN public.ip_items i3 ON i3.id = l3.item_id
                 WHERE e3.study_id = p_study_id AND e3.entry_type = 'dispensed'
                   AND e3.from_study_site_id = p_study_site_id
                   AND (p_category IS NULL OR p_category = '' OR i3.category = p_category)), 0)
      END AS pct
  )
  SELECT
    f.id,
    f.name,
    f.category,
    f.unit,
    COALESCE(gs.qty, 0)::BIGINT,
    COALESCE((SELECT q FROM ledger_by_item li WHERE li.item_id = f.id AND li.entry_type = 'shipped_to_site'), 0)::BIGINT,
    COALESCE((SELECT q FROM ledger_by_item li WHERE li.item_id = f.id AND li.entry_type = 'returned_to_global'), 0)::BIGINT,
    GREATEST(0, COALESCE(sl.in_transit, 0))::BIGINT,
    COALESCE(sl.shipments_received, 0)::BIGINT,
    COALESCE(sl.returned, 0)::BIGINT,
    COALESCE(sl.used_amt, 0)::BIGINT,
    COALESCE(sl.transfers, 0)::BIGINT,
    COALESCE(sl.destroyed_amt, 0)::BIGINT,
    COALESCE(sl2.onsite, 0)::BIGINT,
    COALESCE(sl2.avail, 0)::BIGINT,
    (SELECT pct FROM compliance LIMIT 1)
  FROM items_f f
  LEFT JOIN global_stock gs ON gs.item_id = f.id
  LEFT JOIN site_ledger sl ON sl.item_id = f.id
  LEFT JOIN site_loc sl2 ON sl2.item_id = f.id;
$$;

COMMENT ON FUNCTION public.ip_get_study_metrics IS
'IP inventory summary metrics. global_sent=ledger shipped_to_site (left global). site_in_transit=shipped_to_site minus received_at_site. site_shipments=ledger received_at_site. Onsite/available from locations. compliance_pct=100*count(verified)/NULLIF(count(dispensed),0).';

-- ---------------------------------------------------------------------------
-- View: flattened log rows for site-scoped inventory log UI
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
  (ill.disposition = 'used' AND ill.verified_at IS NULL) AS flag_unverified_used
FROM public.ip_lot_locations ill
JOIN public.ip_lots l ON l.id = ill.lot_id
JOIN public.ip_items i ON i.id = l.item_id
LEFT JOIN public.study_sites ss ON ss.id = ill.study_site_id
WHERE ill.study_site_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- View: disposition counts for widgets (quantity-weighted)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.ip_v_disposition_totals WITH (security_invoker = true) AS
SELECT
  i.study_id,
  ill.study_site_id,
  i.category,
  ill.disposition,
  SUM(ill.quantity_on_hand)::BIGINT AS total_qty
FROM public.ip_lot_locations ill
JOIN public.ip_lots l ON l.id = ill.lot_id
JOIN public.ip_items i ON i.id = l.item_id
WHERE ill.study_site_id IS NOT NULL
GROUP BY i.study_id, ill.study_site_id, i.category, ill.disposition;

GRANT SELECT ON public.ip_v_log_rows TO authenticated;
GRANT SELECT ON public.ip_v_disposition_totals TO authenticated;

GRANT EXECUTE ON FUNCTION public.ip_create_item(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ip_initial_global_receipt(UUID, UUID, INTEGER, TEXT, TEXT, TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ip_ship_to_site(UUID, UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ip_receive_at_site(UUID, UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ip_in_transit_lines(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ip_dispense(UUID, UUID, UUID, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ip_verify_lot(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ip_return_to_global(UUID, UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ip_transfer_site(UUID, UUID, UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ip_destroy_at_site(UUID, UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ip_get_study_metrics(UUID, UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- Reconciliation: row-level flags (expected vs on-hand left to future counts)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ip_reconciliation_flags(
  p_study_id UUID,
  p_study_site_id UUID DEFAULT NULL
) RETURNS TABLE (
  location_id UUID,
  lot_id UUID,
  item_id UUID,
  flag_unverified_used BOOLEAN,
  flag_quantity_mismatch BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    ill.id,
    l.id,
    i.id,
    (ill.disposition = 'used' AND ill.verified_at IS NULL),
    (ill.quantity_available > ill.quantity_on_hand OR ill.quantity_on_hand < 0 OR ill.quantity_available < 0)
  FROM public.ip_lot_locations ill
  JOIN public.ip_lots l ON l.id = ill.lot_id
  JOIN public.ip_items i ON i.id = l.item_id
  WHERE i.study_id = p_study_id
    AND ill.study_site_id IS NOT NULL
    AND (p_study_site_id IS NULL OR ill.study_site_id = p_study_site_id);
$$;

COMMENT ON FUNCTION public.ip_reconciliation_flags IS
'Surfaces IP rows needing attention: used disposition without verify timestamp, or impossible quantity pairs.';

GRANT EXECUTE ON FUNCTION public.ip_reconciliation_flags(UUID, UUID) TO authenticated;
