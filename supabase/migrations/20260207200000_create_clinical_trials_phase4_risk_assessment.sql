-- ============================================================================
-- Clinical Trials Phase 4: Risk Assessment
-- ============================================================================
-- This migration adds:
-- 1. Risk assessment templates
-- 2. Risk assessment questions
-- 3. Risk assessment question values (impact/probability/detectability)
-- 4. Risk assessments (execution instances)
-- 5. Risk assessment responses
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Risk category
DO $$ BEGIN
  CREATE TYPE risk_category AS ENUM (
    'quality',
    'safety',
    'regulatory',
    'operational',
    'financial',
    'data_integrity',
    'compliance',
    'ethics'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- RISK ASSESSMENT TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.risk_assessment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('program', 'protocol', 'region', 'site')),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_templates_company ON public.risk_assessment_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_risk_templates_type ON public.risk_assessment_templates(assessment_type);
CREATE INDEX IF NOT EXISTS idx_risk_templates_active ON public.risk_assessment_templates(is_active);

-- RLS for risk_assessment_templates
ALTER TABLE public.risk_assessment_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view risk templates in their company"
  ON public.risk_assessment_templates FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert risk templates in their company"
  ON public.risk_assessment_templates FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update risk templates in their company"
  ON public.risk_assessment_templates FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete risk templates in their company"
  ON public.risk_assessment_templates FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Updated at trigger
DROP TRIGGER IF EXISTS set_risk_templates_updated_at ON public.risk_assessment_templates;
CREATE TRIGGER set_risk_templates_updated_at
  BEFORE UPDATE ON public.risk_assessment_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RISK ASSESSMENT QUESTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.risk_assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.risk_assessment_templates(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  category risk_category NOT NULL,
  weight DECIMAL(3, 2) DEFAULT 1.00 CHECK (weight >= 0 AND weight <= 10),
  considerations TEXT,
  sequence INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_risk_questions_template ON public.risk_assessment_questions(template_id);
CREATE INDEX IF NOT EXISTS idx_risk_questions_company ON public.risk_assessment_questions(company_id);
CREATE INDEX IF NOT EXISTS idx_risk_questions_sequence ON public.risk_assessment_questions(template_id, sequence);

-- RLS for risk_assessment_questions
ALTER TABLE public.risk_assessment_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view risk questions in their company"
  ON public.risk_assessment_questions FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert risk questions in their company"
  ON public.risk_assessment_questions FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update risk questions in their company"
  ON public.risk_assessment_questions FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete risk questions in their company"
  ON public.risk_assessment_questions FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- ============================================================================
-- RISK ASSESSMENT QUESTION VALUES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.risk_assessment_question_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.risk_assessment_questions(id) ON DELETE CASCADE,
  value_label TEXT NOT NULL,
  impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 5),
  probability_score INTEGER CHECK (probability_score >= 1 AND probability_score <= 5),
  detectability_score INTEGER CHECK (detectability_score >= 1 AND detectability_score <= 5),
  sequence INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_risk_values_question ON public.risk_assessment_question_values(question_id);
CREATE INDEX IF NOT EXISTS idx_risk_values_company ON public.risk_assessment_question_values(company_id);

-- RLS for risk_assessment_question_values
ALTER TABLE public.risk_assessment_question_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view risk question values in their company"
  ON public.risk_assessment_question_values FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert risk question values in their company"
  ON public.risk_assessment_question_values FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update risk question values in their company"
  ON public.risk_assessment_question_values FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete risk question values in their company"
  ON public.risk_assessment_question_values FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- ============================================================================
-- RISK ASSESSMENTS (Execution Instances)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.risk_assessment_templates(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('program', 'protocol', 'region', 'site')),
  entity_id UUID NOT NULL,
  assessment_date DATE NOT NULL,
  assessed_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assessed_by_email TEXT,
  total_score DECIMAL(10, 2),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  rationale TEXT,
  functional_impact TEXT,
  mitigation_plan TEXT,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'reviewed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_company ON public.risk_assessments(company_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_template ON public.risk_assessments(template_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_entity ON public.risk_assessments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_date ON public.risk_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_level ON public.risk_assessments(risk_level);

-- RLS for risk_assessments
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view risk assessments in their company"
  ON public.risk_assessments FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert risk assessments in their company"
  ON public.risk_assessments FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update risk assessments in their company"
  ON public.risk_assessments FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete risk assessments in their company"
  ON public.risk_assessments FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Updated at trigger
DROP TRIGGER IF EXISTS set_risk_assessments_updated_at ON public.risk_assessments;
CREATE TRIGGER set_risk_assessments_updated_at
  BEFORE UPDATE ON public.risk_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RISK ASSESSMENT RESPONSES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.risk_assessment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.risk_assessments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.risk_assessment_questions(id) ON DELETE CASCADE,
  selected_value_id UUID REFERENCES public.risk_assessment_question_values(id) ON DELETE SET NULL,
  response_text TEXT,
  calculated_score DECIMAL(10, 2),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assessment_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_risk_responses_assessment ON public.risk_assessment_responses(assessment_id);
CREATE INDEX IF NOT EXISTS idx_risk_responses_question ON public.risk_assessment_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_risk_responses_company ON public.risk_assessment_responses(company_id);

-- RLS for risk_assessment_responses
ALTER TABLE public.risk_assessment_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view risk responses in their company"
  ON public.risk_assessment_responses FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert risk responses in their company"
  ON public.risk_assessment_responses FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update risk responses in their company"
  ON public.risk_assessment_responses FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete risk responses in their company"
  ON public.risk_assessment_responses FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Updated at trigger
DROP TRIGGER IF EXISTS set_risk_responses_updated_at ON public.risk_assessment_responses;
CREATE TRIGGER set_risk_responses_updated_at
  BEFORE UPDATE ON public.risk_assessment_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
