-- Phase 3: Budget Template Wizard + Template Library

CREATE TABLE IF NOT EXISTS study_budget_templates (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name                 TEXT        NOT NULL,
  description          TEXT,
  section_definitions  JSONB       NOT NULL DEFAULT '[]',
  visit_schedule       JSONB,
  default_indirect_rate NUMERIC,
  version              INT         NOT NULL DEFAULT 1,
  cloned_from_id       UUID        REFERENCES study_budget_templates(id) ON DELETE SET NULL,
  created_by           UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_budget_templates_company_id ON study_budget_templates(company_id);
ALTER TABLE study_budget_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_budget_templates_select" ON study_budget_templates FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "study_budget_templates_insert" ON study_budget_templates FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "study_budget_templates_update" ON study_budget_templates FOR UPDATE USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "study_budget_templates_delete" ON study_budget_templates FOR DELETE USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

ALTER TABLE study_budgets
  ADD COLUMN IF NOT EXISTS template_id         UUID    REFERENCES study_budget_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS indirect_rate       NUMERIC,
  ADD COLUMN IF NOT EXISTS planned_enrollment  INT,
  ADD COLUMN IF NOT EXISTS study_duration_months INT;

CREATE INDEX IF NOT EXISTS idx_study_budgets_template_id ON study_budgets(template_id);
