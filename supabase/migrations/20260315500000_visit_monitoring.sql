-- =====================================================
-- Monitoring Visits
-- =====================================================

CREATE TABLE IF NOT EXISTS public.monitoring_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.study_sites(id) ON DELETE CASCADE,
  visit_type TEXT NOT NULL DEFAULT 'routine' CHECK (visit_type IN ('routine', 'for_cause', 'close_out', 'pre_study', 'interim')),
  monitor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  planned_date DATE,
  actual_date DATE,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_visits_study ON public.monitoring_visits(study_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_visits_site ON public.monitoring_visits(site_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_visits_monitor ON public.monitoring_visits(monitor_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_visits_status ON public.monitoring_visits(status);

CREATE TRIGGER update_monitoring_visits_updated_at
  BEFORE UPDATE ON public.monitoring_visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.monitoring_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monitoring_visits_select" ON public.monitoring_visits
  FOR SELECT USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "monitoring_visits_insert" ON public.monitoring_visits
  FOR INSERT WITH CHECK (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "monitoring_visits_update" ON public.monitoring_visits
  FOR UPDATE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "monitoring_visits_delete" ON public.monitoring_visits
  FOR DELETE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- =====================================================
-- Trip Reports
-- =====================================================

CREATE TABLE IF NOT EXISTS public.trip_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES public.monitoring_visits(id) ON DELETE CASCADE,
  summary TEXT,
  findings TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  submitted_date DATE,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_reports_visit ON public.trip_reports(visit_id);

ALTER TABLE public.trip_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip_reports_select" ON public.trip_reports
  FOR SELECT USING (
    visit_id IN (
      SELECT mv.id FROM public.monitoring_visits mv
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "trip_reports_insert" ON public.trip_reports
  FOR INSERT WITH CHECK (
    visit_id IN (
      SELECT mv.id FROM public.monitoring_visits mv
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "trip_reports_update" ON public.trip_reports
  FOR UPDATE USING (
    visit_id IN (
      SELECT mv.id FROM public.monitoring_visits mv
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "trip_reports_delete" ON public.trip_reports
  FOR DELETE USING (
    created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- =====================================================
-- Trip Report Findings
-- =====================================================

CREATE TABLE IF NOT EXISTS public.trip_report_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_report_id UUID NOT NULL REFERENCES public.trip_reports(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor', 'major', 'critical')),
  resolution_status TEXT NOT NULL DEFAULT 'open' CHECK (resolution_status IN ('open', 'in_progress', 'resolved')),
  resolution_date DATE,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_report_findings_report ON public.trip_report_findings(trip_report_id);

ALTER TABLE public.trip_report_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip_report_findings_select" ON public.trip_report_findings
  FOR SELECT USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "trip_report_findings_insert" ON public.trip_report_findings
  FOR INSERT WITH CHECK (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "trip_report_findings_update" ON public.trip_report_findings
  FOR UPDATE USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "trip_report_findings_delete" ON public.trip_report_findings
  FOR DELETE USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- =====================================================
-- Follow-Up Items
-- =====================================================

CREATE TABLE IF NOT EXISTS public.follow_up_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_report_id UUID NOT NULL REFERENCES public.trip_reports(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  resolved_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_items_report ON public.follow_up_items(trip_report_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_items_assigned ON public.follow_up_items(assigned_to);

ALTER TABLE public.follow_up_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follow_up_items_select" ON public.follow_up_items
  FOR SELECT USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "follow_up_items_insert" ON public.follow_up_items
  FOR INSERT WITH CHECK (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "follow_up_items_update" ON public.follow_up_items
  FOR UPDATE USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "follow_up_items_delete" ON public.follow_up_items
  FOR DELETE USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
