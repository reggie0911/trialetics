-- Centralized Action Item Tracker
-- Cross-module issue tracking with assignment, escalation, and resolution workflow

-- Enum types
DO $$ BEGIN
  CREATE TYPE action_item_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE action_item_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE action_item_source_type AS ENUM ('trip_report', 'monitoring', 'general', 'irb', 'vendor', 'kri');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Action Items
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status action_item_status NOT NULL DEFAULT 'open',
  priority action_item_priority NOT NULL DEFAULT 'medium',
  category TEXT,
  source_type action_item_source_type NOT NULL DEFAULT 'general',
  source_id UUID,
  assigned_to_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date DATE,
  resolved_date TIMESTAMPTZ,
  resolution_notes TEXT,
  escalated BOOLEAN DEFAULT false,
  escalated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_action_items_company ON public.action_items(company_id);
CREATE INDEX IF NOT EXISTS idx_action_items_protocol ON public.action_items(protocol_id);
CREATE INDEX IF NOT EXISTS idx_action_items_assigned_to ON public.action_items(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_action_items_status ON public.action_items(status);
CREATE INDEX IF NOT EXISTS idx_action_items_due_date ON public.action_items(due_date);
CREATE INDEX IF NOT EXISTS idx_action_items_source ON public.action_items(source_type, source_id);

DROP TRIGGER IF EXISTS update_action_items_updated_at ON public.action_items;
CREATE TRIGGER update_action_items_updated_at
  BEFORE UPDATE ON public.action_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view action items in their company"
  ON public.action_items FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage action items in their company"
  ON public.action_items FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.action_items IS 'Centralized cross-module action item tracker';
