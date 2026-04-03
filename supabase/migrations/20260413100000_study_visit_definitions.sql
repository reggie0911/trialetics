-- Phase 2: Visit Schedule + Procedure Cost Grid

CREATE TABLE IF NOT EXISTS study_visit_definitions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id         UUID        NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  visit_name       TEXT        NOT NULL,
  timepoint_label  TEXT,
  timepoint_days   INT,
  sort_order       INT         NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_visit_definitions_study_id ON study_visit_definitions(study_id);
ALTER TABLE study_visit_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_visit_definitions_select" ON study_visit_definitions FOR SELECT USING (study_id IN (SELECT id FROM studies WHERE company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "study_visit_definitions_insert" ON study_visit_definitions FOR INSERT WITH CHECK (study_id IN (SELECT id FROM studies WHERE company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "study_visit_definitions_update" ON study_visit_definitions FOR UPDATE USING (study_id IN (SELECT id FROM studies WHERE company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "study_visit_definitions_delete" ON study_visit_definitions FOR DELETE USING (study_id IN (SELECT id FROM studies WHERE company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())));

CREATE TABLE IF NOT EXISTS study_procedure_visit_costs (
  id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id           UUID    NOT NULL REFERENCES study_budget_sections(id) ON DELETE CASCADE,
  procedure_name       TEXT    NOT NULL,
  visit_definition_id  UUID    NOT NULL REFERENCES study_visit_definitions(id) ON DELETE CASCADE,
  is_applicable        BOOLEAN NOT NULL DEFAULT false,
  unit_cost            NUMERIC NOT NULL DEFAULT 0,
  sort_order           INT     NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (section_id, procedure_name, visit_definition_id)
);

CREATE INDEX IF NOT EXISTS idx_procedure_visit_costs_section_id ON study_procedure_visit_costs(section_id);
CREATE INDEX IF NOT EXISTS idx_procedure_visit_costs_visit_def_id ON study_procedure_visit_costs(visit_definition_id);
ALTER TABLE study_procedure_visit_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_procedure_visit_costs_select" ON study_procedure_visit_costs FOR SELECT USING (section_id IN (SELECT sbs.id FROM study_budget_sections sbs JOIN study_budgets sb ON sb.id = sbs.budget_id JOIN studies s ON s.id = sb.study_id WHERE s.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "study_procedure_visit_costs_insert" ON study_procedure_visit_costs FOR INSERT WITH CHECK (section_id IN (SELECT sbs.id FROM study_budget_sections sbs JOIN study_budgets sb ON sb.id = sbs.budget_id JOIN studies s ON s.id = sb.study_id WHERE s.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "study_procedure_visit_costs_update" ON study_procedure_visit_costs FOR UPDATE USING (section_id IN (SELECT sbs.id FROM study_budget_sections sbs JOIN study_budgets sb ON sb.id = sbs.budget_id JOIN studies s ON s.id = sb.study_id WHERE s.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "study_procedure_visit_costs_delete" ON study_procedure_visit_costs FOR DELETE USING (section_id IN (SELECT sbs.id FROM study_budget_sections sbs JOIN study_budgets sb ON sb.id = sbs.budget_id JOIN studies s ON s.id = sb.study_id WHERE s.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
