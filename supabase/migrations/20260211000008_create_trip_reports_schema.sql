-- ============================================================================
-- Clinical Trip Reports Schema
-- Per Oracle CTMS: Administering and Using Clinical Trip Reports
-- Templates, trip reports, checklist, follow-up, attendees, CRF tracking, approvals
-- ============================================================================

-- ============================================================================
-- 1. trip_report_templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trip_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  visit_type TEXT NOT NULL CHECK (visit_type IN ('evaluation', 'initiation', 'monitoring', 'close_out', 'unscheduled')),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  region TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_report_templates_company_id ON public.trip_report_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_trip_report_templates_visit_type ON public.trip_report_templates(visit_type);
CREATE INDEX IF NOT EXISTS idx_trip_report_templates_project_id ON public.trip_report_templates(project_id);

DROP TRIGGER IF EXISTS update_trip_report_templates_updated_at ON public.trip_report_templates;
CREATE TRIGGER update_trip_report_templates_updated_at
  BEFORE UPDATE ON public.trip_report_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.trip_report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view trip report templates in their company"
  ON public.trip_report_templates FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage trip report templates in their company"
  ON public.trip_report_templates FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.trip_report_templates IS 'Trip report templates per Oracle CTMS: one per visit type (evaluation, initiation, monitoring, close-out)';

-- ============================================================================
-- 2. trip_report_template_details
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trip_report_template_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.trip_report_templates(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('checklist', 'follow_up')),
  activity TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_report_template_details_template_id ON public.trip_report_template_details(template_id);

DROP TRIGGER IF EXISTS update_trip_report_template_details_updated_at ON public.trip_report_template_details;
CREATE TRIGGER update_trip_report_template_details_updated_at
  BEFORE UPDATE ON public.trip_report_template_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.trip_report_template_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view template details via template company"
  ON public.trip_report_template_details FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM public.trip_report_templates
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage template details via template company"
  ON public.trip_report_template_details FOR ALL
  USING (
    template_id IN (
      SELECT id FROM public.trip_report_templates
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT id FROM public.trip_report_templates
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

COMMENT ON TABLE public.trip_report_template_details IS 'Checklist and follow-up activities per template per Oracle CTMS';

-- ============================================================================
-- 3. trip_reports
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trip_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_visit_id UUID NOT NULL REFERENCES public.site_visits(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.trip_report_templates(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started', 'in_progress', 'completed', 'submitted', 'reviewed_with_comments',
    'rejected', 'revised', 'submitted_for_approval', 'approved', 'obsolete'
  )),
  version INTEGER DEFAULT 1,
  completed_date TIMESTAMPTZ,
  trip_report_completed_date TIMESTAMPTZ,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewer_comments TEXT,
  approver_comments TEXT,
  assigned_to_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(site_visit_id, version)
);

CREATE INDEX IF NOT EXISTS idx_trip_reports_site_visit_id ON public.trip_reports(site_visit_id);
CREATE INDEX IF NOT EXISTS idx_trip_reports_template_id ON public.trip_reports(template_id);
CREATE INDEX IF NOT EXISTS idx_trip_reports_status ON public.trip_reports(status);
CREATE INDEX IF NOT EXISTS idx_trip_reports_reviewer_id ON public.trip_reports(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_trip_reports_approver_id ON public.trip_reports(approver_id);

DROP TRIGGER IF EXISTS update_trip_reports_updated_at ON public.trip_reports;
CREATE TRIGGER update_trip_reports_updated_at
  BEFORE UPDATE ON public.trip_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.trip_reports ENABLE ROW LEVEL SECURITY;

-- RLS: access via site_visits.organization_id -> organizations.company_id
CREATE POLICY "Users can view trip reports in their company"
  ON public.trip_reports FOR SELECT
  USING (
    site_visit_id IN (
      SELECT sv.id FROM public.site_visits sv
      JOIN public.organizations o ON o.id = sv.organization_id
      WHERE o.company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage trip reports in their company"
  ON public.trip_reports FOR ALL
  USING (
    site_visit_id IN (
      SELECT sv.id FROM public.site_visits sv
      JOIN public.organizations o ON o.id = sv.organization_id
      WHERE o.company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    site_visit_id IN (
      SELECT sv.id FROM public.site_visits sv
      JOIN public.organizations o ON o.id = sv.organization_id
      WHERE o.company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

COMMENT ON TABLE public.trip_reports IS 'Clinical trip reports per Oracle CTMS; linked to site visits';

-- ============================================================================
-- 4. trip_report_checklist_items
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trip_report_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_report_id UUID NOT NULL REFERENCES public.trip_reports(id) ON DELETE CASCADE,
  activity TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'completed')),
  comments TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_report_checklist_items_trip_report_id ON public.trip_report_checklist_items(trip_report_id);

DROP TRIGGER IF EXISTS update_trip_report_checklist_items_updated_at ON public.trip_report_checklist_items;
CREATE TRIGGER update_trip_report_checklist_items_updated_at
  BEFORE UPDATE ON public.trip_report_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.trip_report_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checklist items via trip report"
  ON public.trip_report_checklist_items FOR SELECT
  USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.site_visits sv ON sv.id = tr.site_visit_id
      JOIN public.organizations o ON o.id = sv.organization_id
      WHERE o.company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage checklist items via trip report"
  ON public.trip_report_checklist_items FOR ALL
  USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.site_visits sv ON sv.id = tr.site_visit_id
      JOIN public.organizations o ON o.id = sv.organization_id
      WHERE o.company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.site_visits sv ON sv.id = tr.site_visit_id
      JOIN public.organizations o ON o.id = sv.organization_id
      WHERE o.company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

COMMENT ON TABLE public.trip_report_checklist_items IS 'Checklist activities from template; status and comments per Oracle CTMS';

-- ============================================================================
-- 5. trip_report_follow_up_items
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trip_report_follow_up_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_report_id UUID NOT NULL REFERENCES public.trip_reports(id) ON DELETE CASCADE,
  activity TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'done')),
  completed_date TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_report_follow_up_items_trip_report_id ON public.trip_report_follow_up_items(trip_report_id);

DROP TRIGGER IF EXISTS update_trip_report_follow_up_items_updated_at ON public.trip_report_follow_up_items;
CREATE TRIGGER update_trip_report_follow_up_items_updated_at
  BEFORE UPDATE ON public.trip_report_follow_up_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.trip_report_follow_up_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view follow-up items via trip report"
  ON public.trip_report_follow_up_items FOR SELECT
  USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.site_visits sv ON sv.id = tr.site_visit_id
      JOIN public.organizations o ON o.id = sv.organization_id
      WHERE o.company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage follow-up items via trip report"
  ON public.trip_report_follow_up_items FOR ALL
  USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.site_visits sv ON sv.id = tr.site_visit_id
      JOIN public.organizations o ON o.id = sv.organization_id
      WHERE o.company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.site_visits sv ON sv.id = tr.site_visit_id
      JOIN public.organizations o ON o.id = sv.organization_id
      WHERE o.company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

COMMENT ON TABLE public.trip_report_follow_up_items IS 'Follow-up issues from trip; completed_date drives status per Oracle CTMS';

-- ============================================================================
-- 6. trip_report_attendees
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trip_report_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_report_id UUID NOT NULL REFERENCES public.trip_reports(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_report_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_report_attendees_trip_report_id ON public.trip_report_attendees(trip_report_id);
CREATE INDEX IF NOT EXISTS idx_trip_report_attendees_contact_id ON public.trip_report_attendees(contact_id);

ALTER TABLE public.trip_report_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attendees via trip report"
  ON public.trip_report_attendees FOR SELECT
  USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.site_visits sv ON sv.id = tr.site_visit_id
      JOIN public.organizations o ON o.id = sv.organization_id
      WHERE o.company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage attendees via trip report"
  ON public.trip_report_attendees FOR ALL
  USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.site_visits sv ON sv.id = tr.site_visit_id
      JOIN public.organizations o ON o.id = sv.organization_id
      WHERE o.company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.site_visits sv ON sv.id = tr.site_visit_id
      JOIN public.organizations o ON o.id = sv.organization_id
      WHERE o.company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

COMMENT ON TABLE public.trip_report_attendees IS 'Site personnel met during visit per Oracle CTMS';

-- ============================================================================
-- 7. trip_report_crf_tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trip_report_crf_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_report_id UUID NOT NULL REFERENCES public.trip_reports(id) ON DELETE CASCADE,
  subject_visit_id UUID REFERENCES public.subject_visits(id) ON DELETE SET NULL,
  subject_identifier TEXT,
  visit_name TEXT,
  source_verified BOOLEAN DEFAULT false,
  retrieved BOOLEAN DEFAULT false,
  page_numbers_verified TEXT,
  charts_reviewed_date TIMESTAMPTZ,
  forms_signed_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_report_crf_tracking_trip_report_id ON public.trip_report_crf_tracking(trip_report_id);
CREATE INDEX IF NOT EXISTS idx_trip_report_crf_tracking_subject_visit_id ON public.trip_report_crf_tracking(subject_visit_id);

DROP TRIGGER IF EXISTS update_trip_report_crf_tracking_updated_at ON public.trip_report_crf_tracking;
CREATE TRIGGER update_trip_report_crf_tracking_updated_at
  BEFORE UPDATE ON public.trip_report_crf_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.trip_report_crf_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view CRF tracking via trip report"
  ON public.trip_report_crf_tracking FOR SELECT
  USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.site_visits sv ON sv.id = tr.site_visit_id
      JOIN public.organizations o ON o.id = sv.organization_id
      WHERE o.company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage CRF tracking via trip report"
  ON public.trip_report_crf_tracking FOR ALL
  USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.site_visits sv ON sv.id = tr.site_visit_id
      JOIN public.organizations o ON o.id = sv.organization_id
      WHERE o.company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.site_visits sv ON sv.id = tr.site_visit_id
      JOIN public.organizations o ON o.id = sv.organization_id
      WHERE o.company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

COMMENT ON TABLE public.trip_report_crf_tracking IS 'CRF tracking for trip reports per Oracle CTMS: source verified, retrieved, page numbers';

-- ============================================================================
-- 8. trip_report_approvals (audit trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trip_report_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_report_id UUID NOT NULL REFERENCES public.trip_reports(id) ON DELETE CASCADE,
  login TEXT,
  old_status TEXT,
  new_status TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_report_approvals_trip_report_id ON public.trip_report_approvals(trip_report_id);

ALTER TABLE public.trip_report_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view approvals via trip report"
  ON public.trip_report_approvals FOR SELECT
  USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.site_visits sv ON sv.id = tr.site_visit_id
      JOIN public.organizations o ON o.id = sv.organization_id
      WHERE o.company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert approvals via trip report"
  ON public.trip_report_approvals FOR INSERT
  WITH CHECK (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.site_visits sv ON sv.id = tr.site_visit_id
      JOIN public.organizations o ON o.id = sv.organization_id
      WHERE o.company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

COMMENT ON TABLE public.trip_report_approvals IS 'Audit trail for trip report status changes per Oracle CTMS';
