-- Patient Engagement and Retention Module
-- Retention milestones, engagement activities, and risk tracking

-- ============================================================================
-- Enum types
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE retention_status AS ENUM ('on_track', 'at_risk', 'missed', 'completed', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE engagement_activity_type AS ENUM (
    'reminder', 'follow_up', 'travel_support', 'incentive',
    'wellness_check', 'reschedule', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE engagement_channel AS ENUM ('phone', 'email', 'sms', 'in_person', 'portal');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE engagement_outcome AS ENUM ('successful', 'no_answer', 'rescheduled', 'declined', 'not_applicable');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE risk_severity AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Retention Milestones
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.retention_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  visit_number INTEGER,
  expected_day INTEGER,
  description TEXT,
  is_critical BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retention_milestones_company ON public.retention_milestones(company_id);
CREATE INDEX IF NOT EXISTS idx_retention_milestones_protocol ON public.retention_milestones(protocol_id);

DROP TRIGGER IF EXISTS update_retention_milestones_updated_at ON public.retention_milestones;
CREATE TRIGGER update_retention_milestones_updated_at
  BEFORE UPDATE ON public.retention_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.retention_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view retention milestones in their company"
  ON public.retention_milestones FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage retention milestones in their company"
  ON public.retention_milestones FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.retention_milestones IS 'Protocol-level retention checkpoints';

DROP TRIGGER IF EXISTS audit_trigger_retention_milestones ON public.retention_milestones;
CREATE TRIGGER audit_trigger_retention_milestones
  AFTER INSERT OR UPDATE OR DELETE ON public.retention_milestones
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================================================
-- Subject Retention Status
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subject_retention_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES public.retention_milestones(id) ON DELETE CASCADE,
  status retention_status DEFAULT 'on_track',
  actual_date DATE,
  days_variance INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (subject_id, milestone_id)
);

CREATE INDEX IF NOT EXISTS idx_subject_retention_subject ON public.subject_retention_status(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_retention_milestone ON public.subject_retention_status(milestone_id);
CREATE INDEX IF NOT EXISTS idx_subject_retention_status ON public.subject_retention_status(status);

DROP TRIGGER IF EXISTS update_subject_retention_status_updated_at ON public.subject_retention_status;
CREATE TRIGGER update_subject_retention_status_updated_at
  BEFORE UPDATE ON public.subject_retention_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.subject_retention_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subject retention in their company"
  ON public.subject_retention_status FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage subject retention in their company"
  ON public.subject_retention_status FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.subject_retention_status IS 'Per-subject retention tracking at each milestone';

-- ============================================================================
-- Engagement Activities
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.engagement_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  activity_type engagement_activity_type NOT NULL,
  channel engagement_channel NOT NULL,
  performed_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  outcome engagement_outcome,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_activities_company ON public.engagement_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_engagement_activities_protocol ON public.engagement_activities(protocol_id);
CREATE INDEX IF NOT EXISTS idx_engagement_activities_subject ON public.engagement_activities(subject_id);
CREATE INDEX IF NOT EXISTS idx_engagement_activities_type ON public.engagement_activities(activity_type);

DROP TRIGGER IF EXISTS update_engagement_activities_updated_at ON public.engagement_activities;
CREATE TRIGGER update_engagement_activities_updated_at
  BEFORE UPDATE ON public.engagement_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.engagement_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view engagement activities in their company"
  ON public.engagement_activities FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage engagement activities in their company"
  ON public.engagement_activities FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.engagement_activities IS 'Patient engagement touchpoints and outcomes';

DROP TRIGGER IF EXISTS audit_trigger_engagement_activities ON public.engagement_activities;
CREATE TRIGGER audit_trigger_engagement_activities
  AFTER INSERT OR UPDATE OR DELETE ON public.engagement_activities
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================================================
-- Retention Risk Factors
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.retention_risk_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  severity risk_severity DEFAULT 'medium',
  auto_detect_rule JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retention_risk_factors_company ON public.retention_risk_factors(company_id);
CREATE INDEX IF NOT EXISTS idx_retention_risk_factors_protocol ON public.retention_risk_factors(protocol_id);

DROP TRIGGER IF EXISTS update_retention_risk_factors_updated_at ON public.retention_risk_factors;
CREATE TRIGGER update_retention_risk_factors_updated_at
  BEFORE UPDATE ON public.retention_risk_factors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.retention_risk_factors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view retention risk factors in their company"
  ON public.retention_risk_factors FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage retention risk factors in their company"
  ON public.retention_risk_factors FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.retention_risk_factors IS 'Configurable retention risk flag definitions';

-- ============================================================================
-- Subject Risk Flags
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subject_risk_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  risk_factor_id UUID NOT NULL REFERENCES public.retention_risk_factors(id) ON DELETE CASCADE,
  flagged_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subject_risk_flags_subject ON public.subject_risk_flags(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_risk_flags_factor ON public.subject_risk_flags(risk_factor_id);
CREATE INDEX IF NOT EXISTS idx_subject_risk_flags_resolved ON public.subject_risk_flags(resolved_at);

DROP TRIGGER IF EXISTS update_subject_risk_flags_updated_at ON public.subject_risk_flags;
CREATE TRIGGER update_subject_risk_flags_updated_at
  BEFORE UPDATE ON public.subject_risk_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.subject_risk_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subject risk flags in their company"
  ON public.subject_risk_flags FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage subject risk flags in their company"
  ON public.subject_risk_flags FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.subject_risk_flags IS 'Per-subject retention risk flags with resolution tracking';

-- ============================================================================
-- Retention Metrics (periodic snapshots)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.retention_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.clinical_sites(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  enrolled INTEGER DEFAULT 0,
  active INTEGER DEFAULT 0,
  withdrawn INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0,
  retention_rate NUMERIC(5,2),
  screen_fail_rate NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retention_metrics_company ON public.retention_metrics(company_id);
CREATE INDEX IF NOT EXISTS idx_retention_metrics_protocol ON public.retention_metrics(protocol_id);
CREATE INDEX IF NOT EXISTS idx_retention_metrics_period ON public.retention_metrics(period_start, period_end);

DROP TRIGGER IF EXISTS update_retention_metrics_updated_at ON public.retention_metrics;
CREATE TRIGGER update_retention_metrics_updated_at
  BEFORE UPDATE ON public.retention_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.retention_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view retention metrics in their company"
  ON public.retention_metrics FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage retention metrics in their company"
  ON public.retention_metrics FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.retention_metrics IS 'Periodic retention rate snapshots by protocol and site';

DROP TRIGGER IF EXISTS audit_trigger_retention_metrics ON public.retention_metrics;
CREATE TRIGGER audit_trigger_retention_metrics
  AFTER INSERT OR UPDATE OR DELETE ON public.retention_metrics
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();
