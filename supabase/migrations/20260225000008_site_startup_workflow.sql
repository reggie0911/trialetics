-- Site Startup Workflow
-- Structured activation checklist with step tracking

DO $$ BEGIN
  CREATE TYPE startup_checklist_status AS ENUM ('not_started', 'in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE startup_step_category AS ENUM ('feasibility', 'regulatory', 'irb', 'contract', 'siv', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE startup_step_status AS ENUM ('pending', 'in_progress', 'completed', 'blocked', 'not_applicable');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 1. Site Startup Checklists
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.site_startup_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.clinical_sites(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL DEFAULT 'Standard Startup',
  status startup_checklist_status NOT NULL DEFAULT 'not_started',
  started_date DATE,
  completed_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_startup_checklists_company ON public.site_startup_checklists(company_id);
CREATE INDEX IF NOT EXISTS idx_startup_checklists_protocol ON public.site_startup_checklists(protocol_id);
CREATE INDEX IF NOT EXISTS idx_startup_checklists_site ON public.site_startup_checklists(site_id);

DROP TRIGGER IF EXISTS update_startup_checklists_updated_at ON public.site_startup_checklists;
CREATE TRIGGER update_startup_checklists_updated_at
  BEFORE UPDATE ON public.site_startup_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.site_startup_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view startup checklists in their company"
  ON public.site_startup_checklists FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage startup checklists in their company"
  ON public.site_startup_checklists FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.site_startup_checklists IS 'Site startup activation checklists per protocol/site';

-- ============================================================================
-- 2. Site Startup Steps
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.site_startup_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.site_startup_checklists(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  step_category startup_step_category NOT NULL DEFAULT 'other',
  sort_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  status startup_step_status NOT NULL DEFAULT 'pending',
  assigned_to_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  target_date DATE,
  completed_date DATE,
  blocker_description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_startup_steps_checklist ON public.site_startup_steps(checklist_id);
CREATE INDEX IF NOT EXISTS idx_startup_steps_company ON public.site_startup_steps(company_id);
CREATE INDEX IF NOT EXISTS idx_startup_steps_status ON public.site_startup_steps(status);

DROP TRIGGER IF EXISTS update_startup_steps_updated_at ON public.site_startup_steps;
CREATE TRIGGER update_startup_steps_updated_at
  BEFORE UPDATE ON public.site_startup_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.site_startup_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view startup steps in their company"
  ON public.site_startup_steps FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage startup steps in their company"
  ON public.site_startup_steps FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.site_startup_steps IS 'Individual steps within a site startup checklist';
