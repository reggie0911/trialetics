-- Clinical Training Module
-- Per Oracle CTMS: Managing Clinical Training
-- Training topics, plans, versions, criteria, site assignment, contact completion

-- ============================================================================
-- 1. Training Topics
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.training_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  role TEXT[] DEFAULT '{}',
  description TEXT,
  mandatory BOOLEAN DEFAULT false,
  duration INTEGER,
  duration_unit TEXT,
  obsolete_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_topics_company ON public.training_topics(company_id);
CREATE INDEX IF NOT EXISTS idx_training_topics_obsolete ON public.training_topics(obsolete_date) WHERE obsolete_date IS NULL;

DROP TRIGGER IF EXISTS update_training_topics_updated_at ON public.training_topics;
CREATE TRIGGER update_training_topics_updated_at
  BEFORE UPDATE ON public.training_topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.training_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view training topics in their company"
  ON public.training_topics FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage training topics in their company"
  ON public.training_topics FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.training_topics IS 'Training topics for clinical training (Oracle: Training Topics)';

-- ============================================================================
-- 2. Training Plans
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  process_status TEXT DEFAULT 'not_started' CHECK (process_status IN ('not_started', 'publishing', 'published', 'failed')),
  obsolete_date TIMESTAMPTZ,
  sites_processed INTEGER DEFAULT 0,
  total_sites INTEGER DEFAULT 0,
  publish_result TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_plans_company ON public.training_plans(company_id);

DROP TRIGGER IF EXISTS update_training_plans_updated_at ON public.training_plans;
CREATE TRIGGER update_training_plans_updated_at
  BEFORE UPDATE ON public.training_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view training plans in their company"
  ON public.training_plans FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage training plans in their company"
  ON public.training_plans FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.training_plans IS 'Training plans grouping topics (Oracle: Training Plans)';

-- ============================================================================
-- 3. Training Plan Criteria
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.training_plan_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_plan_id UUID NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('all', 'specific')),
  indication TEXT,
  trial_phase TEXT,
  site_status TEXT,
  protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE SET NULL,
  region_id UUID REFERENCES public.clinical_regions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_plan_criteria_plan ON public.training_plan_criteria(training_plan_id);

DROP TRIGGER IF EXISTS update_training_plan_criteria_updated_at ON public.training_plan_criteria;
CREATE TRIGGER update_training_plan_criteria_updated_at
  BEFORE UPDATE ON public.training_plan_criteria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.training_plan_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view training plan criteria in their company"
  ON public.training_plan_criteria FOR SELECT
  USING (
    training_plan_id IN (
      SELECT id FROM public.training_plans
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage training plan criteria in their company"
  ON public.training_plan_criteria FOR ALL
  USING (
    training_plan_id IN (
      SELECT id FROM public.training_plans
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    training_plan_id IN (
      SELECT id FROM public.training_plans
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

COMMENT ON TABLE public.training_plan_criteria IS 'Criteria for which sites a training plan applies (Oracle: Training Plan Criteria)';

-- ============================================================================
-- 4. Training Plan Versions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.training_plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_plan_id UUID NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  published_date TIMESTAMPTZ,
  archived_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_plan_versions_plan ON public.training_plan_versions(training_plan_id);
CREATE INDEX IF NOT EXISTS idx_training_plan_versions_status ON public.training_plan_versions(status);

DROP TRIGGER IF EXISTS update_training_plan_versions_updated_at ON public.training_plan_versions;
CREATE TRIGGER update_training_plan_versions_updated_at
  BEFORE UPDATE ON public.training_plan_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.training_plan_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view training plan versions in their company"
  ON public.training_plan_versions FOR SELECT
  USING (
    training_plan_id IN (
      SELECT id FROM public.training_plans
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage training plan versions in their company"
  ON public.training_plan_versions FOR ALL
  USING (
    training_plan_id IN (
      SELECT id FROM public.training_plans
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    training_plan_id IN (
      SELECT id FROM public.training_plans
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

COMMENT ON TABLE public.training_plan_versions IS 'Versions of training plans with associated topics (Oracle: Training Plan Versions)';

-- ============================================================================
-- 5. Training Plan Version Topics (Junction)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.training_plan_version_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.training_plan_versions(id) ON DELETE CASCADE,
  training_topic_id UUID NOT NULL REFERENCES public.training_topics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(version_id, training_topic_id)
);

CREATE INDEX IF NOT EXISTS idx_tpv_topics_version ON public.training_plan_version_topics(version_id);
CREATE INDEX IF NOT EXISTS idx_tpv_topics_topic ON public.training_plan_version_topics(training_topic_id);

ALTER TABLE public.training_plan_version_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view training plan version topics in their company"
  ON public.training_plan_version_topics FOR SELECT
  USING (
    version_id IN (
      SELECT v.id FROM public.training_plan_versions v
      JOIN public.training_plans p ON p.id = v.training_plan_id
      WHERE p.company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage training plan version topics in their company"
  ON public.training_plan_version_topics FOR ALL
  USING (
    version_id IN (
      SELECT v.id FROM public.training_plan_versions v
      JOIN public.training_plans p ON p.id = v.training_plan_id
      WHERE p.company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    version_id IN (
      SELECT v.id FROM public.training_plan_versions v
      JOIN public.training_plans p ON p.id = v.training_plan_id
      WHERE p.company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

COMMENT ON TABLE public.training_plan_version_topics IS 'Training topics in a plan version';

-- ============================================================================
-- 6. Site Training Plans (Manual Assignment)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.site_training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinical_site_id UUID NOT NULL REFERENCES public.clinical_sites(id) ON DELETE CASCADE,
  training_plan_version_id UUID NOT NULL REFERENCES public.training_plan_versions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinical_site_id, training_plan_version_id)
);

CREATE INDEX IF NOT EXISTS idx_site_training_plans_site ON public.site_training_plans(clinical_site_id);
CREATE INDEX IF NOT EXISTS idx_site_training_plans_version ON public.site_training_plans(training_plan_version_id);

ALTER TABLE public.site_training_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view site training plans in their company"
  ON public.site_training_plans FOR SELECT
  USING (
    clinical_site_id IN (
      SELECT id FROM public.clinical_sites
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage site training plans in their company"
  ON public.site_training_plans FOR ALL
  USING (
    clinical_site_id IN (
      SELECT id FROM public.clinical_sites
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    clinical_site_id IN (
      SELECT id FROM public.clinical_sites
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

COMMENT ON TABLE public.site_training_plans IS 'Training plans manually assigned to clinical sites';

-- ============================================================================
-- 7. Site Training Topics (Populated when plan added or manually added)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.site_training_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinical_site_id UUID NOT NULL REFERENCES public.clinical_sites(id) ON DELETE CASCADE,
  training_topic_id UUID NOT NULL REFERENCES public.training_topics(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'from_plan' CHECK (source IN ('from_plan', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinical_site_id, training_topic_id)
);

CREATE INDEX IF NOT EXISTS idx_site_training_topics_site ON public.site_training_topics(clinical_site_id);
CREATE INDEX IF NOT EXISTS idx_site_training_topics_topic ON public.site_training_topics(training_topic_id);

ALTER TABLE public.site_training_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view site training topics in their company"
  ON public.site_training_topics FOR SELECT
  USING (
    clinical_site_id IN (
      SELECT id FROM public.clinical_sites
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage site training topics in their company"
  ON public.site_training_topics FOR ALL
  USING (
    clinical_site_id IN (
      SELECT id FROM public.clinical_sites
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    clinical_site_id IN (
      SELECT id FROM public.clinical_sites
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

COMMENT ON TABLE public.site_training_topics IS 'Training topics assigned to sites (from plan or manual)';

-- ============================================================================
-- 8. Contact Training Completion
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contact_training_completion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_contact_id UUID NOT NULL REFERENCES public.protocol_contacts(id) ON DELETE CASCADE,
  site_training_topic_id UUID NOT NULL REFERENCES public.site_training_topics(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_date TIMESTAMPTZ,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(protocol_contact_id, site_training_topic_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_training_completion_contact ON public.contact_training_completion(protocol_contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_training_completion_site_topic ON public.contact_training_completion(site_training_topic_id);

DROP TRIGGER IF EXISTS update_contact_training_completion_updated_at ON public.contact_training_completion;
CREATE TRIGGER update_contact_training_completion_updated_at
  BEFORE UPDATE ON public.contact_training_completion
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.contact_training_completion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contact training completion in their company"
  ON public.contact_training_completion FOR SELECT
  USING (
    protocol_contact_id IN (
      SELECT id FROM public.protocol_contacts
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage contact training completion in their company"
  ON public.contact_training_completion FOR ALL
  USING (
    protocol_contact_id IN (
      SELECT id FROM public.protocol_contacts
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    protocol_contact_id IN (
      SELECT id FROM public.protocol_contacts
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

COMMENT ON TABLE public.contact_training_completion IS 'Per-contact completion status for site training topics';

-- ============================================================================
-- 9. Protocol Training Summary View
-- ============================================================================

CREATE OR REPLACE VIEW public.protocol_training_summary AS
SELECT
  cp.id AS protocol_id,
  cp.company_id,
  cp.protocol_number,
  cp.title,
  COALESCE((
    SELECT COUNT(DISTINCT stt.training_topic_id)
    FROM public.clinical_sites cs
    JOIN public.site_training_topics stt ON stt.clinical_site_id = cs.id
    WHERE cs.protocol_id = cp.id
  ), 0)::integer AS total_trainings,
  COALESCE((
    SELECT COUNT(*)
    FROM public.contact_training_completion ctc
    JOIN public.site_training_topics stt ON stt.id = ctc.site_training_topic_id
    JOIN public.clinical_sites cs ON cs.id = stt.clinical_site_id
    WHERE cs.protocol_id = cp.id AND ctc.completed = true
  ), 0)::integer AS trainings_completed,
  (SELECT COUNT(*)::integer FROM public.clinical_sites WHERE protocol_id = cp.id) AS total_sites
FROM public.clinical_protocols cp;

COMMENT ON VIEW public.protocol_training_summary IS 'Protocol-level training completion summary';

-- ============================================================================
-- 10. Region Training Summary View
-- ============================================================================

CREATE OR REPLACE VIEW public.region_training_summary AS
SELECT
  cr.id AS region_id,
  cr.company_id,
  cr.region_name,
  cr.protocol_id,
  COALESCE((
    SELECT COUNT(DISTINCT stt.training_topic_id)
    FROM public.clinical_sites cs
    JOIN public.site_training_topics stt ON stt.clinical_site_id = cs.id
    WHERE cs.region_id = cr.id
  ), 0)::integer AS total_trainings,
  COALESCE((
    SELECT COUNT(*)
    FROM public.contact_training_completion ctc
    JOIN public.site_training_topics stt ON stt.id = ctc.site_training_topic_id
    JOIN public.clinical_sites cs ON cs.id = stt.clinical_site_id
    WHERE cs.region_id = cr.id AND ctc.completed = true
  ), 0)::integer AS trainings_completed,
  (SELECT COUNT(*)::integer FROM public.clinical_sites WHERE region_id = cr.id) AS total_sites
FROM public.clinical_regions cr;

COMMENT ON VIEW public.region_training_summary IS 'Region-level training completion summary';
