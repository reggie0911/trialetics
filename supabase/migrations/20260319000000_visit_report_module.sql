-- =====================================================
-- Visit Report Module
-- Extends monitoring_visits and trip_reports; adds templates and question responses
-- =====================================================

-- 1.1 Extend monitoring_visits
ALTER TABLE public.monitoring_visits
  ADD COLUMN IF NOT EXISTS visit_name TEXT,
  ADD COLUMN IF NOT EXISTS visit_location TEXT CHECK (visit_location IS NULL OR visit_location IN ('onsite', 'remote')),
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Extend visit_type to include SQV, SIV, Monitoring, Closeout (keep existing values)
ALTER TABLE public.monitoring_visits DROP CONSTRAINT IF EXISTS monitoring_visits_visit_type_check;
ALTER TABLE public.monitoring_visits ADD CONSTRAINT monitoring_visits_visit_type_check
  CHECK (visit_type IN (
    'routine', 'for_cause', 'close_out', 'pre_study', 'interim',
    'sqv', 'siv', 'monitoring'
  ));

-- 1.2 Create visit_report_templates (before trip_reports so we can add template_id FK)
CREATE TABLE IF NOT EXISTS public.visit_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  visit_report_type TEXT NOT NULL CHECK (visit_report_type IN ('sqv', 'siv', 'monitoring', 'close_out')),
  days_submission INTEGER NOT NULL DEFAULT 14,
  days_approval INTEGER NOT NULL DEFAULT 7,
  template_status TEXT NOT NULL DEFAULT 'active' CHECK (template_status IN ('active', 'inactive')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_report_templates_company ON public.visit_report_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_visit_report_templates_type ON public.visit_report_templates(visit_report_type);

CREATE TRIGGER update_visit_report_templates_updated_at
  BEFORE UPDATE ON public.visit_report_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.visit_report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visit_report_templates_select" ON public.visit_report_templates
  FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "visit_report_templates_insert" ON public.visit_report_templates
  FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "visit_report_templates_update" ON public.visit_report_templates
  FOR UPDATE USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "visit_report_templates_delete" ON public.visit_report_templates
  FOR DELETE USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- 1.1 continued: Extend trip_reports
ALTER TABLE public.trip_reports
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.visit_report_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS report_status TEXT CHECK (report_status IS NULL OR report_status IN (
    'report_pending', 'authoring', 'submitted', 'under_review', 'returned', 'approved_and_signed'
  )),
  ADD COLUMN IF NOT EXISTS submission_due_date DATE,
  ADD COLUMN IF NOT EXISTS approval_due_date DATE,
  ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_trip_reports_template ON public.trip_reports(template_id);
CREATE INDEX IF NOT EXISTS idx_trip_reports_report_status ON public.trip_reports(report_status);
CREATE INDEX IF NOT EXISTS idx_trip_reports_reviewer ON public.trip_reports(reviewer_id);

-- 1.2 visit_report_template_questions
CREATE TABLE IF NOT EXISTS public.visit_report_template_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.visit_report_templates(id) ON DELETE CASCADE,
  report_order INTEGER NOT NULL DEFAULT 0,
  report_section TEXT,
  report_sub_section TEXT,
  question_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_report_template_questions_template ON public.visit_report_template_questions(template_id);

ALTER TABLE public.visit_report_template_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visit_report_template_questions_select" ON public.visit_report_template_questions
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM public.visit_report_templates
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "visit_report_template_questions_insert" ON public.visit_report_template_questions
  FOR INSERT WITH CHECK (
    template_id IN (
      SELECT id FROM public.visit_report_templates
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "visit_report_template_questions_update" ON public.visit_report_template_questions
  FOR UPDATE USING (
    template_id IN (
      SELECT id FROM public.visit_report_templates
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "visit_report_template_questions_delete" ON public.visit_report_template_questions
  FOR DELETE USING (
    template_id IN (
      SELECT id FROM public.visit_report_templates
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- 1.3 trip_report_question_responses
CREATE TABLE IF NOT EXISTS public.trip_report_question_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_report_id UUID NOT NULL REFERENCES public.trip_reports(id) ON DELETE CASCADE,
  template_question_id UUID NOT NULL REFERENCES public.visit_report_template_questions(id) ON DELETE CASCADE,
  response TEXT CHECK (response IS NULL OR response IN ('yes', 'no', 'nd', 'na')),
  comments TEXT,
  reviewer_comments TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trip_report_id, template_question_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_report_question_responses_report ON public.trip_report_question_responses(trip_report_id);
CREATE INDEX IF NOT EXISTS idx_trip_report_question_responses_question ON public.trip_report_question_responses(template_question_id);

CREATE TRIGGER update_trip_report_question_responses_updated_at
  BEFORE UPDATE ON public.trip_report_question_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.trip_report_question_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip_report_question_responses_select" ON public.trip_report_question_responses
  FOR SELECT USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "trip_report_question_responses_insert" ON public.trip_report_question_responses
  FOR INSERT WITH CHECK (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "trip_report_question_responses_update" ON public.trip_report_question_responses
  FOR UPDATE USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "trip_report_question_responses_delete" ON public.trip_report_question_responses
  FOR DELETE USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
