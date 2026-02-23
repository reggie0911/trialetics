-- IRB/EC Tracking Module
-- Track IRB submissions, approvals, amendments, and continuing reviews

DO $$ BEGIN
  CREATE TYPE irb_submission_type AS ENUM ('initial', 'amendment', 'continuing_review', 'safety_report', 'closure');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE irb_submission_status AS ENUM ('submitted', 'under_review', 'approved', 'approved_with_conditions', 'disapproved', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE irb_continuing_review_status AS ENUM ('pending', 'submitted', 'approved', 'lapsed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.irb_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.clinical_sites(id) ON DELETE SET NULL,
  irb_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  submission_type irb_submission_type NOT NULL,
  submission_date DATE,
  reference_number TEXT,
  status irb_submission_status NOT NULL DEFAULT 'submitted',
  response_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_irb_submissions_company ON public.irb_submissions(company_id);
CREATE INDEX IF NOT EXISTS idx_irb_submissions_protocol ON public.irb_submissions(protocol_id);
CREATE INDEX IF NOT EXISTS idx_irb_submissions_status ON public.irb_submissions(status);

DROP TRIGGER IF EXISTS update_irb_submissions_updated_at ON public.irb_submissions;
CREATE TRIGGER update_irb_submissions_updated_at
  BEFORE UPDATE ON public.irb_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.irb_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view irb_submissions in their company"
  ON public.irb_submissions FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage irb_submissions in their company"
  ON public.irb_submissions FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.irb_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.irb_submissions(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  approval_date DATE,
  expiration_date DATE,
  approval_number TEXT,
  conditions TEXT,
  approved_consent_version TEXT,
  approved_protocol_version TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_irb_approvals_company ON public.irb_approvals(company_id);
CREATE INDEX IF NOT EXISTS idx_irb_approvals_submission ON public.irb_approvals(submission_id);
CREATE INDEX IF NOT EXISTS idx_irb_approvals_expiration ON public.irb_approvals(expiration_date);

DROP TRIGGER IF EXISTS update_irb_approvals_updated_at ON public.irb_approvals;
CREATE TRIGGER update_irb_approvals_updated_at
  BEFORE UPDATE ON public.irb_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.irb_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view irb_approvals in their company"
  ON public.irb_approvals FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage irb_approvals in their company"
  ON public.irb_approvals FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.irb_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES public.irb_submissions(id) ON DELETE SET NULL,
  amendment_number TEXT,
  amendment_type TEXT CHECK (amendment_type IN ('protocol', 'consent', 'ib', 'other')),
  description TEXT,
  submitted_date DATE,
  approved_date DATE,
  implementation_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  affected_sites UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_irb_amendments_company ON public.irb_amendments(company_id);
CREATE INDEX IF NOT EXISTS idx_irb_amendments_protocol ON public.irb_amendments(protocol_id);
CREATE INDEX IF NOT EXISTS idx_irb_amendments_status ON public.irb_amendments(status);

DROP TRIGGER IF EXISTS update_irb_amendments_updated_at ON public.irb_amendments;
CREATE TRIGGER update_irb_amendments_updated_at
  BEFORE UPDATE ON public.irb_amendments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.irb_amendments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view irb_amendments in their company"
  ON public.irb_amendments FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage irb_amendments in their company"
  ON public.irb_amendments FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.irb_continuing_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES public.irb_submissions(id) ON DELETE SET NULL,
  review_period_start DATE,
  review_period_end DATE,
  due_date DATE,
  submitted_date DATE,
  approved_date DATE,
  status irb_continuing_review_status NOT NULL DEFAULT 'pending',
  subject_enrollment_summary TEXT,
  adverse_event_summary TEXT,
  protocol_deviation_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_irb_continuing_reviews_company ON public.irb_continuing_reviews(company_id);
CREATE INDEX IF NOT EXISTS idx_irb_continuing_reviews_protocol ON public.irb_continuing_reviews(protocol_id);
CREATE INDEX IF NOT EXISTS idx_irb_continuing_reviews_status ON public.irb_continuing_reviews(status);

DROP TRIGGER IF EXISTS update_irb_continuing_reviews_updated_at ON public.irb_continuing_reviews;
CREATE TRIGGER update_irb_continuing_reviews_updated_at
  BEFORE UPDATE ON public.irb_continuing_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.irb_continuing_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view irb_continuing_reviews in their company"
  ON public.irb_continuing_reviews FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage irb_continuing_reviews in their company"
  ON public.irb_continuing_reviews FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
