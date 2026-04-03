-- Phase 1: Structured Budget Sections
-- Adds study_budget_sections table and new nullable columns on budget_line_items.

CREATE TABLE IF NOT EXISTS study_budget_sections (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id   UUID        NOT NULL REFERENCES study_budgets(id) ON DELETE CASCADE,
  section_type TEXT       NOT NULL,
  name        TEXT        NOT NULL,
  indirect_rate NUMERIC,
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE study_budget_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_budget_sections_select" ON study_budget_sections FOR SELECT USING (budget_id IN (SELECT sb.id FROM study_budgets sb JOIN studies s ON s.id = sb.study_id WHERE s.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "study_budget_sections_insert" ON study_budget_sections FOR INSERT WITH CHECK (budget_id IN (SELECT sb.id FROM study_budgets sb JOIN studies s ON s.id = sb.study_id WHERE s.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "study_budget_sections_update" ON study_budget_sections FOR UPDATE USING (budget_id IN (SELECT sb.id FROM study_budgets sb JOIN studies s ON s.id = sb.study_id WHERE s.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "study_budget_sections_delete" ON study_budget_sections FOR DELETE USING (budget_id IN (SELECT sb.id FROM study_budgets sb JOIN studies s ON s.id = sb.study_id WHERE s.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())));

ALTER TABLE budget_line_items
  ADD COLUMN IF NOT EXISTS section_id   UUID    REFERENCES study_budget_sections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS direct_cost  NUMERIC,
  ADD COLUMN IF NOT EXISTS indirect_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS cost_basis   TEXT;

CREATE INDEX IF NOT EXISTS idx_budget_line_items_section_id ON budget_line_items(section_id);
CREATE INDEX IF NOT EXISTS idx_study_budget_sections_budget_id ON study_budget_sections(budget_id);
