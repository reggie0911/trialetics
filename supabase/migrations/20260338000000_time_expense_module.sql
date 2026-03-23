-- =====================================================
-- CTMS Time & Expense: timesheets, expense reports,
-- approvals, audit log, storage, company settings
-- =====================================================

-- ---------- Company settings (overtime / regular hours) ----------
CREATE TABLE IF NOT EXISTS public.company_time_expense_settings (
  company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  daily_regular_hours NUMERIC(5,2) NOT NULL DEFAULT 8,
  weekly_regular_hours NUMERIC(5,2) NOT NULL DEFAULT 40,
  overtime_multiplier NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_company_time_expense_settings_updated_at
  BEFORE UPDATE ON public.company_time_expense_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.company_time_expense_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_time_expense_settings_select" ON public.company_time_expense_settings FOR SELECT USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "company_time_expense_settings_insert" ON public.company_time_expense_settings FOR INSERT WITH CHECK (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin' AND company_id = company_time_expense_settings.company_id)
);
CREATE POLICY "company_time_expense_settings_update" ON public.company_time_expense_settings FOR UPDATE USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin' AND company_id = company_time_expense_settings.company_id)
);

INSERT INTO public.company_time_expense_settings (company_id)
SELECT c.id FROM public.companies c
WHERE NOT EXISTS (SELECT 1 FROM public.company_time_expense_settings s WHERE s.company_id = c.id);

-- ---------- Reference: activity types & expense categories ----------
CREATE TABLE IF NOT EXISTS public.time_activity_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_time_activity_types_company ON public.time_activity_types(company_id);

CREATE TRIGGER update_time_activity_types_updated_at
  BEFORE UPDATE ON public.time_activity_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.time_activity_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "time_activity_types_select" ON public.time_activity_types FOR SELECT USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "time_activity_types_insert" ON public.time_activity_types FOR INSERT WITH CHECK (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin' AND company_id = time_activity_types.company_id)
);
CREATE POLICY "time_activity_types_update" ON public.time_activity_types FOR UPDATE USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin' AND company_id = time_activity_types.company_id)
);
CREATE POLICY "time_activity_types_delete" ON public.time_activity_types FOR DELETE USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin' AND company_id = time_activity_types.company_id)
);

CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_company ON public.expense_categories(company_id);

CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_categories_select" ON public.expense_categories FOR SELECT USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "expense_categories_insert" ON public.expense_categories FOR INSERT WITH CHECK (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin' AND company_id = expense_categories.company_id)
);
CREATE POLICY "expense_categories_update" ON public.expense_categories FOR UPDATE USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin' AND company_id = expense_categories.company_id)
);
CREATE POLICY "expense_categories_delete" ON public.expense_categories FOR DELETE USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin' AND company_id = expense_categories.company_id)
);

-- ---------- Approval templates (per company, per applies_to) ----------
CREATE TABLE IF NOT EXISTS public.time_expense_approval_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('timesheet', 'expense')),
  name TEXT NOT NULL DEFAULT 'Default',
  is_default BOOLEAN NOT NULL DEFAULT false,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial unique: one default per (company, applies_to)
DROP INDEX IF EXISTS idx_time_expense_approval_templates_one_default_per_type;
CREATE UNIQUE INDEX idx_time_expense_approval_templates_one_default_per_type
  ON public.time_expense_approval_templates(company_id, applies_to)
  WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_time_expense_approval_templates_company ON public.time_expense_approval_templates(company_id);

CREATE TRIGGER update_time_expense_approval_templates_updated_at
  BEFORE UPDATE ON public.time_expense_approval_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.time_expense_approval_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "time_expense_approval_templates_select" ON public.time_expense_approval_templates FOR SELECT USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "time_expense_approval_templates_insert" ON public.time_expense_approval_templates FOR INSERT WITH CHECK (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin' AND company_id = time_expense_approval_templates.company_id)
);
CREATE POLICY "time_expense_approval_templates_update" ON public.time_expense_approval_templates FOR UPDATE USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin' AND company_id = time_expense_approval_templates.company_id)
);
CREATE POLICY "time_expense_approval_templates_delete" ON public.time_expense_approval_templates FOR DELETE USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin' AND company_id = time_expense_approval_templates.company_id)
);

-- ---------- Timesheet periods (single study per period, v1) ----------
CREATE TABLE IF NOT EXISTS public.timesheet_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'submitted', 'under_review', 'changes_requested', 'approved', 'rejected'
  )),
  approval_step INTEGER NOT NULL DEFAULT 0,
  template_id UUID REFERENCES public.time_expense_approval_templates(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  total_hours NUMERIC(10,2),
  billable_hours NUMERIC(10,2),
  overtime_hours NUMERIC(10,2),
  approved_snapshot JSONB,
  version INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, study_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_timesheet_periods_company ON public.timesheet_periods(company_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_periods_study ON public.timesheet_periods(study_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_periods_profile ON public.timesheet_periods(profile_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_periods_status ON public.timesheet_periods(status);
CREATE INDEX IF NOT EXISTS idx_timesheet_periods_week ON public.timesheet_periods(week_start_date);

CREATE TRIGGER update_timesheet_periods_updated_at
  BEFORE UPDATE ON public.timesheet_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.timesheet_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timesheet_periods_select" ON public.timesheet_periods FOR SELECT USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "timesheet_periods_insert" ON public.timesheet_periods FOR INSERT WITH CHECK (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  AND profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  AND study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
);

CREATE POLICY "timesheet_periods_update" ON public.timesheet_periods FOR UPDATE USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin' AND p.company_id = timesheet_periods.company_id
    )
    OR (
      profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      AND status IN ('draft', 'changes_requested')
    )
  )
);

CREATE POLICY "timesheet_periods_delete" ON public.timesheet_periods FOR DELETE USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  AND profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  AND status = 'draft'
);

-- ---------- Timesheet entries ----------
CREATE TABLE IF NOT EXISTS public.timesheet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.timesheet_periods(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.study_sites(id) ON DELETE SET NULL,
  activity_type_id UUID NOT NULL REFERENCES public.time_activity_types(id) ON DELETE RESTRICT,
  hours NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (hours >= 0 AND hours <= 24),
  is_billable BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  sort_index INTEGER NOT NULL DEFAULT 0,
  ai_suggestions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timesheet_entries_period ON public.timesheet_entries(period_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_work_date ON public.timesheet_entries(work_date);

CREATE TRIGGER update_timesheet_entries_updated_at
  BEFORE UPDATE ON public.timesheet_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.timesheet_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timesheet_entries_select" ON public.timesheet_entries FOR SELECT USING (
  period_id IN (SELECT id FROM public.timesheet_periods WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
);

CREATE POLICY "timesheet_entries_insert" ON public.timesheet_entries FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.timesheet_periods tp
    WHERE tp.id = timesheet_entries.period_id
      AND tp.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
      AND tp.profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      AND tp.status IN ('draft', 'changes_requested')
  )
  AND study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  AND study_id = (SELECT study_id FROM public.timesheet_periods WHERE id = timesheet_entries.period_id)
  AND (site_id IS NULL OR site_id IN (SELECT id FROM public.study_sites WHERE study_id = timesheet_entries.study_id))
);

CREATE POLICY "timesheet_entries_update" ON public.timesheet_entries FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.timesheet_periods tp
    WHERE tp.id = timesheet_entries.period_id
      AND tp.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
      AND (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin' AND p.company_id = tp.company_id)
        OR (tp.profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND tp.status IN ('draft', 'changes_requested'))
      )
  )
);

CREATE POLICY "timesheet_entries_delete" ON public.timesheet_entries FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.timesheet_periods tp
    WHERE tp.id = timesheet_entries.period_id
      AND tp.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
      AND tp.profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      AND tp.status IN ('draft', 'changes_requested')
  )
);

-- ---------- Expense reports (single study per report, v1) ----------
CREATE TABLE IF NOT EXISTS public.expense_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Expense report',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'submitted', 'under_review', 'changes_requested', 'approved', 'rejected'
  )),
  approval_step INTEGER NOT NULL DEFAULT 0,
  template_id UUID REFERENCES public.time_expense_approval_templates(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  total_amount NUMERIC(14,2),
  approved_snapshot JSONB,
  version INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_reports_company ON public.expense_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_expense_reports_study ON public.expense_reports(study_id);
CREATE INDEX IF NOT EXISTS idx_expense_reports_profile ON public.expense_reports(profile_id);
CREATE INDEX IF NOT EXISTS idx_expense_reports_status ON public.expense_reports(status);

CREATE TRIGGER update_expense_reports_updated_at
  BEFORE UPDATE ON public.expense_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.expense_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_reports_select" ON public.expense_reports FOR SELECT USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "expense_reports_insert" ON public.expense_reports FOR INSERT WITH CHECK (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  AND profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  AND study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
);

CREATE POLICY "expense_reports_update" ON public.expense_reports FOR UPDATE USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin' AND p.company_id = expense_reports.company_id
    )
    OR (
      profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      AND status IN ('draft', 'changes_requested')
    )
  )
);

CREATE POLICY "expense_reports_delete" ON public.expense_reports FOR DELETE USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  AND profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  AND status = 'draft'
);

-- ---------- Expense lines ----------
CREATE TABLE IF NOT EXISTS public.expense_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.expense_reports(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL,
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.study_sites(id) ON DELETE SET NULL,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT,
  merchant TEXT,
  ai_suggestions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_lines_report ON public.expense_lines(report_id);
CREATE INDEX IF NOT EXISTS idx_expense_lines_date ON public.expense_lines(expense_date);

CREATE TRIGGER update_expense_lines_updated_at
  BEFORE UPDATE ON public.expense_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.expense_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_lines_select" ON public.expense_lines FOR SELECT USING (
  report_id IN (SELECT id FROM public.expense_reports WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
);

CREATE POLICY "expense_lines_insert" ON public.expense_lines FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.expense_reports er
    WHERE er.id = expense_lines.report_id
      AND er.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
      AND er.profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      AND er.status IN ('draft', 'changes_requested')
  )
  AND study_id = (SELECT study_id FROM public.expense_reports WHERE id = expense_lines.report_id)
  AND (site_id IS NULL OR site_id IN (SELECT id FROM public.study_sites WHERE study_id = expense_lines.study_id))
);

CREATE POLICY "expense_lines_update" ON public.expense_lines FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.expense_reports er
    WHERE er.id = expense_lines.report_id
      AND er.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
      AND (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin' AND p.company_id = er.company_id)
        OR (er.profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND er.status IN ('draft', 'changes_requested'))
      )
  )
);

CREATE POLICY "expense_lines_delete" ON public.expense_lines FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.expense_reports er
    WHERE er.id = expense_lines.report_id
      AND er.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
      AND er.profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      AND er.status IN ('draft', 'changes_requested')
  )
);

-- ---------- Receipt files ----------
CREATE TABLE IF NOT EXISTS public.expense_receipt_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id UUID NOT NULL REFERENCES public.expense_lines(id) ON DELETE CASCADE,
  storage_object_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  uploaded_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_receipt_files_line ON public.expense_receipt_files(line_id);

ALTER TABLE public.expense_receipt_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_receipt_files_select" ON public.expense_receipt_files FOR SELECT USING (
  line_id IN (
    SELECT el.id FROM public.expense_lines el
    JOIN public.expense_reports er ON er.id = el.report_id
    WHERE er.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "expense_receipt_files_insert" ON public.expense_receipt_files FOR INSERT WITH CHECK (
  line_id IN (
    SELECT el.id FROM public.expense_lines el
    JOIN public.expense_reports er ON er.id = el.report_id
    WHERE er.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
      AND er.profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      AND er.status IN ('draft', 'changes_requested')
  )
  AND uploaded_by_profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "expense_receipt_files_delete" ON public.expense_receipt_files FOR DELETE USING (
  line_id IN (
    SELECT el.id FROM public.expense_lines el
    JOIN public.expense_reports er ON er.id = el.report_id
    WHERE er.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
      AND er.profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      AND er.status IN ('draft', 'changes_requested')
  )
);

-- ---------- Approval decisions ----------
CREATE TABLE IF NOT EXISTS public.timesheet_approval_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.timesheet_periods(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'changes_requested')),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timesheet_approval_decisions_period ON public.timesheet_approval_decisions(period_id);

ALTER TABLE public.timesheet_approval_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timesheet_approval_decisions_select" ON public.timesheet_approval_decisions FOR SELECT USING (
  period_id IN (SELECT id FROM public.timesheet_periods WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "timesheet_approval_decisions_insert" ON public.timesheet_approval_decisions FOR INSERT WITH CHECK (
  period_id IN (SELECT id FROM public.timesheet_periods WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  AND profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.expense_approval_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.expense_reports(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'changes_requested')),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_approval_decisions_report ON public.expense_approval_decisions(report_id);

ALTER TABLE public.expense_approval_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_approval_decisions_select" ON public.expense_approval_decisions FOR SELECT USING (
  report_id IN (SELECT id FROM public.expense_reports WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "expense_approval_decisions_insert" ON public.expense_approval_decisions FOR INSERT WITH CHECK (
  report_id IN (SELECT id FROM public.expense_reports WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  AND profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- ---------- Seed defaults for existing companies ----------
INSERT INTO public.time_activity_types (company_id, code, label, sort_order)
SELECT c.id, v.code, v.label, v.ord
FROM public.companies c
CROSS JOIN (VALUES
  ('monitoring_visit', 'Monitoring visit', 0),
  ('travel', 'Travel', 1),
  ('admin', 'Administration', 2),
  ('training', 'Training', 3),
  ('other', 'Other', 4)
) AS v(code, label, ord)
ON CONFLICT (company_id, code) DO NOTHING;

INSERT INTO public.expense_categories (company_id, code, label, sort_order)
SELECT c.id, v.code, v.label, v.ord
FROM public.companies c
CROSS JOIN (VALUES
  ('travel', 'Travel', 0),
  ('meals', 'Meals', 1),
  ('lodging', 'Lodging', 2),
  ('supplies', 'Supplies', 3),
  ('other', 'Other', 4)
) AS v(code, label, ord)
ON CONFLICT (company_id, code) DO NOTHING;

INSERT INTO public.time_expense_approval_templates (company_id, applies_to, name, is_default, steps)
SELECT c.id, 'timesheet', 'Default timesheet workflow', true,
  '[
    {"order":0,"label":"Manager review","study_roles_any":["clinical_project_manager","cra_manager","clinical_research_associate"]},
    {"order":1,"label":"Finance review","study_roles_any":["finance_reviewer","accounts_payable_specialist","finance_director"]}
  ]'::jsonb
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.time_expense_approval_templates t WHERE t.company_id = c.id AND t.applies_to = 'timesheet' AND t.is_default = true
);

INSERT INTO public.time_expense_approval_templates (company_id, applies_to, name, is_default, steps)
SELECT c.id, 'expense', 'Default expense workflow', true,
  '[
    {"order":0,"label":"Manager review","study_roles_any":["clinical_project_manager","cra_manager"]},
    {"order":1,"label":"Finance review","study_roles_any":["finance_reviewer","accounts_payable_specialist","site_budget_specialist","finance_director"]}
  ]'::jsonb
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.time_expense_approval_templates t WHERE t.company_id = c.id AND t.applies_to = 'expense' AND t.is_default = true
);

-- Trigger: new company gets defaults
CREATE OR REPLACE FUNCTION public.ensure_time_expense_defaults_for_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.company_time_expense_settings (company_id) VALUES (NEW.id)
  ON CONFLICT (company_id) DO NOTHING;

  INSERT INTO public.time_activity_types (company_id, code, label, sort_order) VALUES
    (NEW.id, 'monitoring_visit', 'Monitoring visit', 0),
    (NEW.id, 'travel', 'Travel', 1),
    (NEW.id, 'admin', 'Administration', 2),
    (NEW.id, 'training', 'Training', 3),
    (NEW.id, 'other', 'Other', 4)
  ON CONFLICT (company_id, code) DO NOTHING;

  INSERT INTO public.expense_categories (company_id, code, label, sort_order) VALUES
    (NEW.id, 'travel', 'Travel', 0),
    (NEW.id, 'meals', 'Meals', 1),
    (NEW.id, 'lodging', 'Lodging', 2),
    (NEW.id, 'supplies', 'Supplies', 3),
    (NEW.id, 'other', 'Other', 4)
  ON CONFLICT (company_id, code) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.time_expense_approval_templates t WHERE t.company_id = NEW.id AND t.applies_to = 'timesheet' AND t.is_default) THEN
    INSERT INTO public.time_expense_approval_templates (company_id, applies_to, name, is_default, steps) VALUES
      (NEW.id, 'timesheet', 'Default timesheet workflow', true,
        '[
          {"order":0,"label":"Manager review","study_roles_any":["clinical_project_manager","cra_manager","clinical_research_associate"]},
          {"order":1,"label":"Finance review","study_roles_any":["finance_reviewer","accounts_payable_specialist","finance_director"]}
        ]'::jsonb);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.time_expense_approval_templates t WHERE t.company_id = NEW.id AND t.applies_to = 'expense' AND t.is_default) THEN
    INSERT INTO public.time_expense_approval_templates (company_id, applies_to, name, is_default, steps) VALUES
      (NEW.id, 'expense', 'Default expense workflow', true,
        '[
          {"order":0,"label":"Manager review","study_roles_any":["clinical_project_manager","cra_manager"]},
          {"order":1,"label":"Finance review","study_roles_any":["finance_reviewer","accounts_payable_specialist","site_budget_specialist","finance_director"]}
        ]'::jsonb);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_companies_time_expense_defaults ON public.companies;
CREATE TRIGGER trg_companies_time_expense_defaults
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_time_expense_defaults_for_company();

-- ---------- Recalculate timesheet period totals (trigger) ----------
CREATE OR REPLACE FUNCTION public.refresh_timesheet_period_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_id uuid;
  v_company_id uuid;
  v_daily NUMERIC;
  v_weekly_cap NUMERIC;
  v_total NUMERIC;
  v_billable NUMERIC;
  v_ot NUMERIC;
  d record;
BEGIN
  v_period_id := COALESCE(NEW.period_id, OLD.period_id);
  SELECT tp.company_id INTO v_company_id FROM public.timesheet_periods tp WHERE tp.id = v_period_id;
  SELECT COALESCE(daily_regular_hours, 8), COALESCE(weekly_regular_hours, 40)
  INTO v_daily, v_weekly_cap
  FROM public.company_time_expense_settings WHERE company_id = v_company_id;

  SELECT COALESCE(SUM(hours), 0), COALESCE(SUM(hours) FILTER (WHERE is_billable), 0)
  INTO v_total, v_billable
  FROM public.timesheet_entries WHERE period_id = v_period_id;

  v_ot := 0;
  FOR d IN
    SELECT work_date AS wd, SUM(hours) AS day_h
    FROM public.timesheet_entries
    WHERE period_id = v_period_id
    GROUP BY work_date
  LOOP
    IF d.day_h > v_daily THEN
      v_ot := v_ot + (d.day_h - v_daily);
    END IF;
  END LOOP;

  IF v_total > v_weekly_cap THEN
    v_ot := GREATEST(v_ot, v_total - v_weekly_cap);
  END IF;

  UPDATE public.timesheet_periods
  SET total_hours = v_total, billable_hours = v_billable, overtime_hours = v_ot, updated_at = NOW()
  WHERE id = v_period_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_timesheet_entries_refresh_totals ON public.timesheet_entries;
CREATE TRIGGER trg_timesheet_entries_refresh_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.timesheet_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_timesheet_period_totals();

-- ---------- Recalculate expense report total ----------
CREATE OR REPLACE FUNCTION public.refresh_expense_report_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report_id uuid;
  v_sum NUMERIC;
BEGIN
  v_report_id := COALESCE(NEW.report_id, OLD.report_id);
  SELECT COALESCE(SUM(amount), 0) INTO v_sum FROM public.expense_lines WHERE report_id = v_report_id;
  UPDATE public.expense_reports SET total_amount = v_sum, updated_at = NOW() WHERE id = v_report_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_expense_lines_refresh_total ON public.expense_lines;
CREATE TRIGGER trg_expense_lines_refresh_total
  AFTER INSERT OR UPDATE OR DELETE ON public.expense_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_expense_report_total();

-- ---------- RPC: timesheet period decision ----------
CREATE OR REPLACE FUNCTION public.timesheet_period_record_decision(
  p_period_id uuid,
  p_decision text,
  p_comment text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_company_id uuid;
  v_app_role text;
  v_period record;
  v_template record;
  v_steps jsonb;
  v_step jsonb;
  v_allowed jsonb;
  v_role text;
  v_ok boolean := false;
  v_next_step int;
  v_new_status text;
  v_snapshot jsonb;
BEGIN
  IF p_decision IS NULL OR p_decision NOT IN ('approved', 'rejected', 'changes_requested') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_decision');
  END IF;

  SELECT id, company_id, role INTO v_profile_id, v_company_id, v_app_role
  FROM public.profiles WHERE user_id = auth.uid();
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_period FROM public.timesheet_periods WHERE id = p_period_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'period_not_found');
  END IF;
  IF v_period.company_id IS DISTINCT FROM v_company_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF p_decision = 'changes_requested' THEN
    IF v_period.status NOT IN ('submitted', 'under_review') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'period_not_in_review');
    END IF;
    UPDATE public.timesheet_periods SET status = 'changes_requested', updated_at = NOW(), version = version + 1 WHERE id = p_period_id;
    INSERT INTO public.timesheet_approval_decisions (period_id, step_index, profile_id, decision, comment)
    VALUES (p_period_id, v_period.approval_step, v_profile_id, 'changes_requested', NULLIF(trim(p_comment), ''));
    INSERT INTO public.finance_transaction_log (company_id, study_id, entity_type, entity_id, action, actor_profile_id, from_state, to_state, payload)
    VALUES (v_company_id, v_period.study_id, 'timesheet_period', p_period_id, 'request_changes', v_profile_id, v_period.status, 'changes_requested',
      jsonb_build_object('step', v_period.approval_step));
    RETURN jsonb_build_object('ok', true, 'status', 'changes_requested');
  END IF;

  IF p_decision = 'rejected' THEN
    UPDATE public.timesheet_periods SET status = 'rejected', updated_at = NOW(), version = version + 1 WHERE id = p_period_id;
    INSERT INTO public.timesheet_approval_decisions (period_id, step_index, profile_id, decision, comment)
    VALUES (p_period_id, v_period.approval_step, v_profile_id, 'rejected', NULLIF(trim(p_comment), ''));
    INSERT INTO public.finance_transaction_log (company_id, study_id, entity_type, entity_id, action, actor_profile_id, from_state, to_state, payload)
    VALUES (v_company_id, v_period.study_id, 'timesheet_period', p_period_id, 'reject', v_profile_id, v_period.status, 'rejected',
      jsonb_build_object('step', v_period.approval_step));
    RETURN jsonb_build_object('ok', true, 'status', 'rejected');
  END IF;

  IF v_period.status NOT IN ('submitted', 'under_review') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'period_not_in_review');
  END IF;

  SELECT * INTO v_template FROM public.time_expense_approval_templates
  WHERE id = COALESCE(v_period.template_id, (
    SELECT id FROM public.time_expense_approval_templates t
    WHERE t.company_id = v_period.company_id AND t.applies_to = 'timesheet' AND t.is_default = true LIMIT 1
  ));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_template');
  END IF;

  v_steps := v_template.steps;
  IF jsonb_typeof(v_steps) <> 'array' OR jsonb_array_length(v_steps) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_template');
  END IF;

  IF v_period.approval_step >= jsonb_array_length(v_steps) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_pending_step');
  END IF;

  v_step := v_steps -> v_period.approval_step;
  v_allowed := v_step -> 'study_roles_any';

  IF v_app_role = 'admin' THEN
    v_ok := true;
  ELSE
    FOR v_role IN
      SELECT stm.role::text FROM public.study_team_members stm
      WHERE stm.study_id = v_period.study_id AND stm.profile_id = v_profile_id AND stm.is_active = true
    LOOP
      IF EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(v_allowed) AS ar(val) WHERE ar.val = v_role
      ) THEN
        v_ok := true;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  IF NOT v_ok THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authorized_for_step');
  END IF;

  INSERT INTO public.timesheet_approval_decisions (period_id, step_index, profile_id, decision, comment)
  VALUES (p_period_id, v_period.approval_step, v_profile_id, 'approved', NULLIF(trim(p_comment), ''));

  v_next_step := v_period.approval_step + 1;
  IF v_next_step >= jsonb_array_length(v_steps) THEN
    v_new_status := 'approved';
    SELECT jsonb_build_object(
      'period', row_to_json(tp.*),
      'entries', COALESCE((SELECT jsonb_agg(row_to_json(e.*)) FROM public.timesheet_entries e WHERE e.period_id = tp.id), '[]'::jsonb)
    ) INTO v_snapshot
    FROM public.timesheet_periods tp WHERE tp.id = p_period_id;

    UPDATE public.timesheet_periods
    SET status = 'approved', approval_step = v_next_step, approved_snapshot = v_snapshot, updated_at = NOW(), version = version + 1
    WHERE id = p_period_id;
  ELSE
    v_new_status := 'under_review';
    UPDATE public.timesheet_periods
    SET status = 'under_review', approval_step = v_next_step, updated_at = NOW(), version = version + 1
    WHERE id = p_period_id;
  END IF;

  INSERT INTO public.finance_transaction_log (company_id, study_id, entity_type, entity_id, action, actor_profile_id, from_state, to_state, payload)
  VALUES (
    v_company_id,
    v_period.study_id,
    'timesheet_period',
    p_period_id,
    'approve_step',
    v_profile_id,
    v_period.status,
    v_new_status,
    jsonb_build_object('step_completed', v_period.approval_step, 'next_step', v_next_step)
  );

  RETURN jsonb_build_object('ok', true, 'status', v_new_status, 'approval_step', v_next_step);
END;
$$;

REVOKE ALL ON FUNCTION public.timesheet_period_record_decision(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.timesheet_period_record_decision(uuid, text, text) TO authenticated;

-- ---------- RPC: expense report decision ----------
CREATE OR REPLACE FUNCTION public.expense_report_record_decision(
  p_report_id uuid,
  p_decision text,
  p_comment text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_company_id uuid;
  v_app_role text;
  v_report record;
  v_template record;
  v_steps jsonb;
  v_step jsonb;
  v_allowed jsonb;
  v_role text;
  v_ok boolean := false;
  v_next_step int;
  v_new_status text;
  v_snapshot jsonb;
BEGIN
  IF p_decision IS NULL OR p_decision NOT IN ('approved', 'rejected', 'changes_requested') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_decision');
  END IF;

  SELECT id, company_id, role INTO v_profile_id, v_company_id, v_app_role
  FROM public.profiles WHERE user_id = auth.uid();
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_report FROM public.expense_reports WHERE id = p_report_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'report_not_found');
  END IF;
  IF v_report.company_id IS DISTINCT FROM v_company_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF p_decision = 'changes_requested' THEN
    IF v_report.status NOT IN ('submitted', 'under_review') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'report_not_in_review');
    END IF;
    UPDATE public.expense_reports SET status = 'changes_requested', updated_at = NOW(), version = version + 1 WHERE id = p_report_id;
    INSERT INTO public.expense_approval_decisions (report_id, step_index, profile_id, decision, comment)
    VALUES (p_report_id, v_report.approval_step, v_profile_id, 'changes_requested', NULLIF(trim(p_comment), ''));
    INSERT INTO public.finance_transaction_log (company_id, study_id, entity_type, entity_id, action, actor_profile_id, from_state, to_state, payload)
    VALUES (v_company_id, v_report.study_id, 'expense_report', p_report_id, 'request_changes', v_profile_id, v_report.status, 'changes_requested',
      jsonb_build_object('step', v_report.approval_step));
    RETURN jsonb_build_object('ok', true, 'status', 'changes_requested');
  END IF;

  IF p_decision = 'rejected' THEN
    UPDATE public.expense_reports SET status = 'rejected', updated_at = NOW(), version = version + 1 WHERE id = p_report_id;
    INSERT INTO public.expense_approval_decisions (report_id, step_index, profile_id, decision, comment)
    VALUES (p_report_id, v_report.approval_step, v_profile_id, 'rejected', NULLIF(trim(p_comment), ''));
    INSERT INTO public.finance_transaction_log (company_id, study_id, entity_type, entity_id, action, actor_profile_id, from_state, to_state, payload)
    VALUES (v_company_id, v_report.study_id, 'expense_report', p_report_id, 'reject', v_profile_id, v_report.status, 'rejected',
      jsonb_build_object('step', v_report.approval_step));
    RETURN jsonb_build_object('ok', true, 'status', 'rejected');
  END IF;

  IF v_report.status NOT IN ('submitted', 'under_review') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'report_not_in_review');
  END IF;

  SELECT * INTO v_template FROM public.time_expense_approval_templates
  WHERE id = COALESCE(v_report.template_id, (
    SELECT id FROM public.time_expense_approval_templates t
    WHERE t.company_id = v_report.company_id AND t.applies_to = 'expense' AND t.is_default = true LIMIT 1
  ));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_template');
  END IF;

  v_steps := v_template.steps;
  IF jsonb_typeof(v_steps) <> 'array' OR jsonb_array_length(v_steps) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_template');
  END IF;

  IF v_report.approval_step >= jsonb_array_length(v_steps) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_pending_step');
  END IF;

  v_step := v_steps -> v_report.approval_step;
  v_allowed := v_step -> 'study_roles_any';

  IF v_app_role = 'admin' THEN
    v_ok := true;
  ELSE
    FOR v_role IN
      SELECT stm.role::text FROM public.study_team_members stm
      WHERE stm.study_id = v_report.study_id AND stm.profile_id = v_profile_id AND stm.is_active = true
    LOOP
      IF EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(v_allowed) AS ar(val) WHERE ar.val = v_role
      ) THEN
        v_ok := true;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  IF NOT v_ok THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authorized_for_step');
  END IF;

  INSERT INTO public.expense_approval_decisions (report_id, step_index, profile_id, decision, comment)
  VALUES (p_report_id, v_report.approval_step, v_profile_id, 'approved', NULLIF(trim(p_comment), ''));

  v_next_step := v_report.approval_step + 1;
  IF v_next_step >= jsonb_array_length(v_steps) THEN
    v_new_status := 'approved';
    SELECT jsonb_build_object(
      'report', row_to_json(er.*),
      'lines', COALESCE((SELECT jsonb_agg(row_to_json(l.*)) FROM public.expense_lines l WHERE l.report_id = er.id), '[]'::jsonb)
    ) INTO v_snapshot
    FROM public.expense_reports er WHERE er.id = p_report_id;

    UPDATE public.expense_reports
    SET status = 'approved', approval_step = v_next_step, approved_snapshot = v_snapshot, updated_at = NOW(), version = version + 1
    WHERE id = p_report_id;
  ELSE
    v_new_status := 'under_review';
    UPDATE public.expense_reports
    SET status = 'under_review', approval_step = v_next_step, updated_at = NOW(), version = version + 1
    WHERE id = p_report_id;
  END IF;

  INSERT INTO public.finance_transaction_log (company_id, study_id, entity_type, entity_id, action, actor_profile_id, from_state, to_state, payload)
  VALUES (
    v_company_id,
    v_report.study_id,
    'expense_report',
    p_report_id,
    'approve_step',
    v_profile_id,
    v_report.status,
    v_new_status,
    jsonb_build_object('step_completed', v_report.approval_step, 'next_step', v_next_step)
  );

  RETURN jsonb_build_object('ok', true, 'status', v_new_status, 'approval_step', v_next_step);
END;
$$;

REVOKE ALL ON FUNCTION public.expense_report_record_decision(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expense_report_record_decision(uuid, text, text) TO authenticated;

-- ---------- Storage: expense receipts ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expense-receipts',
  'expense-receipts',
  false,
  20971520,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']::text[];

CREATE OR REPLACE FUNCTION public.expense_receipts_storage_company_id(path text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(split_part(path, '/', 1), '')::uuid;
$$;

DROP POLICY IF EXISTS "expense_receipts_select" ON storage.objects;
CREATE POLICY "expense_receipts_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'expense-receipts'
    AND expense_receipts_storage_company_id(name) = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "expense_receipts_insert" ON storage.objects;
CREATE POLICY "expense_receipts_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'expense-receipts'
    AND expense_receipts_storage_company_id(name) = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "expense_receipts_update" ON storage.objects;
CREATE POLICY "expense_receipts_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'expense-receipts'
    AND expense_receipts_storage_company_id(name) = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "expense_receipts_delete" ON storage.objects;
CREATE POLICY "expense_receipts_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'expense-receipts'
    AND expense_receipts_storage_company_id(name) = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );
