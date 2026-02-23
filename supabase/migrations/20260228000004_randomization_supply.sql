-- Randomization and Supply Tracking Module
-- Study randomization lists, assignments, supply inventory, shipments, dispensing

-- ============================================================================
-- Enum types
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE randomization_method AS ENUM ('simple', 'block', 'stratified', 'adaptive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE randomization_list_status AS ENUM ('draft', 'active', 'locked', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE supply_item_status AS ENUM ('available', 'reserved', 'dispensed', 'expired', 'returned', 'destroyed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE shipment_status AS ENUM ('pending', 'in_transit', 'delivered', 'confirmed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Randomization Lists
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.randomization_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  method randomization_method DEFAULT 'simple',
  strata_definition JSONB DEFAULT '[]'::jsonb,
  block_size INTEGER,
  treatment_arms TEXT[] DEFAULT '{}',
  status randomization_list_status DEFAULT 'draft',
  created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_randomization_lists_company ON public.randomization_lists(company_id);
CREATE INDEX IF NOT EXISTS idx_randomization_lists_protocol ON public.randomization_lists(protocol_id);

DROP TRIGGER IF EXISTS update_randomization_lists_updated_at ON public.randomization_lists;
CREATE TRIGGER update_randomization_lists_updated_at
  BEFORE UPDATE ON public.randomization_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.randomization_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view randomization lists in their company"
  ON public.randomization_lists FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage randomization lists in their company"
  ON public.randomization_lists FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.randomization_lists IS 'Study-level randomization list configurations';

DROP TRIGGER IF EXISTS audit_trigger_randomization_lists ON public.randomization_lists;
CREATE TRIGGER audit_trigger_randomization_lists
  AFTER INSERT OR UPDATE OR DELETE ON public.randomization_lists
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================================================
-- Randomization Assignments
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.randomization_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES public.randomization_lists(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL,
  treatment_arm TEXT NOT NULL,
  stratum_values JSONB DEFAULT '{}'::jsonb,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (list_id, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_randomization_assignments_list ON public.randomization_assignments(list_id);
CREATE INDEX IF NOT EXISTS idx_randomization_assignments_subject ON public.randomization_assignments(subject_id);

ALTER TABLE public.randomization_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view randomization assignments in their company"
  ON public.randomization_assignments FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage randomization assignments in their company"
  ON public.randomization_assignments FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.randomization_assignments IS 'Per-subject randomization assignments with arm and strata';

-- ============================================================================
-- Supply Items (catalog)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.supply_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT DEFAULT 'unit',
  storage_conditions TEXT,
  shelf_life_months INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supply_items_company ON public.supply_items(company_id);
CREATE INDEX IF NOT EXISTS idx_supply_items_protocol ON public.supply_items(protocol_id);

DROP TRIGGER IF EXISTS update_supply_items_updated_at ON public.supply_items;
CREATE TRIGGER update_supply_items_updated_at
  BEFORE UPDATE ON public.supply_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.supply_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view supply items in their company"
  ON public.supply_items FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage supply items in their company"
  ON public.supply_items FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.supply_items IS 'Drug/device supply item catalog per protocol';

DROP TRIGGER IF EXISTS audit_trigger_supply_items ON public.supply_items;
CREATE TRIGGER audit_trigger_supply_items
  AFTER INSERT OR UPDATE OR DELETE ON public.supply_items
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================================================
-- Supply Inventory (per-site stock)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.supply_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supply_item_id UUID NOT NULL REFERENCES public.supply_items(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.clinical_sites(id) ON DELETE SET NULL,
  lot_number TEXT NOT NULL,
  quantity_available INTEGER DEFAULT 0,
  quantity_reserved INTEGER DEFAULT 0,
  quantity_dispensed INTEGER DEFAULT 0,
  expiry_date DATE,
  status supply_item_status DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supply_inventory_company ON public.supply_inventory(company_id);
CREATE INDEX IF NOT EXISTS idx_supply_inventory_item ON public.supply_inventory(supply_item_id);
CREATE INDEX IF NOT EXISTS idx_supply_inventory_site ON public.supply_inventory(site_id);
CREATE INDEX IF NOT EXISTS idx_supply_inventory_expiry ON public.supply_inventory(expiry_date);

DROP TRIGGER IF EXISTS update_supply_inventory_updated_at ON public.supply_inventory;
CREATE TRIGGER update_supply_inventory_updated_at
  BEFORE UPDATE ON public.supply_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.supply_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view supply inventory in their company"
  ON public.supply_inventory FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage supply inventory in their company"
  ON public.supply_inventory FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.supply_inventory IS 'Per-site supply inventory with lot tracking';

-- ============================================================================
-- Supply Shipments
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.supply_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  from_location TEXT,
  to_site_id UUID REFERENCES public.clinical_sites(id) ON DELETE SET NULL,
  items JSONB DEFAULT '[]'::jsonb,
  status shipment_status DEFAULT 'pending',
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  tracking_number TEXT,
  notes TEXT,
  created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supply_shipments_company ON public.supply_shipments(company_id);
CREATE INDEX IF NOT EXISTS idx_supply_shipments_protocol ON public.supply_shipments(protocol_id);
CREATE INDEX IF NOT EXISTS idx_supply_shipments_status ON public.supply_shipments(status);

DROP TRIGGER IF EXISTS update_supply_shipments_updated_at ON public.supply_shipments;
CREATE TRIGGER update_supply_shipments_updated_at
  BEFORE UPDATE ON public.supply_shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.supply_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view supply shipments in their company"
  ON public.supply_shipments FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage supply shipments in their company"
  ON public.supply_shipments FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.supply_shipments IS 'Supply shipment tracking between locations and sites';

DROP TRIGGER IF EXISTS audit_trigger_supply_shipments ON public.supply_shipments;
CREATE TRIGGER audit_trigger_supply_shipments
  AFTER INSERT OR UPDATE OR DELETE ON public.supply_shipments
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================================================
-- Supply Dispensing Records
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.supply_dispensing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  supply_item_id UUID NOT NULL REFERENCES public.supply_items(id) ON DELETE CASCADE,
  lot_number TEXT,
  quantity INTEGER DEFAULT 1,
  dispensed_at TIMESTAMPTZ DEFAULT NOW(),
  dispensed_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supply_dispensing_company ON public.supply_dispensing_records(company_id);
CREATE INDEX IF NOT EXISTS idx_supply_dispensing_subject ON public.supply_dispensing_records(subject_id);
CREATE INDEX IF NOT EXISTS idx_supply_dispensing_item ON public.supply_dispensing_records(supply_item_id);

ALTER TABLE public.supply_dispensing_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view dispensing records in their company"
  ON public.supply_dispensing_records FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage dispensing records in their company"
  ON public.supply_dispensing_records FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.supply_dispensing_records IS 'Per-subject supply dispensing log';
